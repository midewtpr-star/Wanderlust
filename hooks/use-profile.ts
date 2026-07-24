import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import type { AgeBand, PublicProfile, ProfileVisibility } from "@/types";

// The world-facing profile columns we read/write here, plus the safety flags
// (age band + moderator) needed to gate the public toggle and the mod tools.
// (Theme columns live in the theme provider; trip/PII columns are never edited
// on a world surface.)
const PROFILE_SELECT =
  "id, display_name, handle, avatar_url, bio, home_city, visibility, age_band, is_moderator, suspended_at";

type ProfileRow = PublicProfile & {
  age_band: AgeBand | null;
  is_moderator: boolean;
  suspended_at: string | null;
};

export type ProfileEdit = {
  display_name?: string | null;
  handle?: string | null;
  bio?: string | null;
  home_city?: string | null;
  visibility?: ProfileVisibility;
};

// Client-side handle rule — mirrors the DB CHECK (lowercase, 3–20, [a-z0-9_]).
// Returns a normalized handle (or null to clear), or an error string.
export function normalizeHandle(raw: string): { handle: string | null } | { error: string } {
  const h = raw.trim().toLowerCase().replace(/^@/, "");
  if (h === "") return { handle: null };
  if (!/^[a-z0-9_]{3,20}$/.test(h)) {
    return { error: "Handles are 3–20 characters: letters, numbers or _." };
  }
  return { handle: h };
}

// The signed-in user's own profile (self-read always allowed by RLS) + editing
// the world-facing fields. Handle uniqueness is enforced by the DB; a taken
// handle surfaces as a friendly error.
export function useMyProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();
    if (error) setError(error.message);
    const row = (data as ProfileRow) ?? null;
    setProfile(row);
    setAgeBand(row?.age_band ?? null);
    setIsModerator(row?.is_moderator ?? false);
    setSuspended(!!row?.suspended_at);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Persist a partial edit. Validates the handle locally first, then maps a
  // unique-violation into a readable message. Returns true on success.
  const save = useCallback(
    async (edit: ProfileEdit): Promise<boolean> => {
      if (!userId) return false;
      setError(null);

      const patch: Record<string, unknown> = {};
      if (edit.display_name !== undefined) patch.display_name = edit.display_name?.trim() || null;
      if (edit.bio !== undefined) patch.bio = edit.bio?.trim() || null;
      if (edit.home_city !== undefined) patch.home_city = edit.home_city?.trim() || null;
      if (edit.visibility !== undefined) patch.visibility = edit.visibility;
      if (edit.handle !== undefined) {
        const res = normalizeHandle(edit.handle ?? "");
        if ("error" in res) {
          setError(res.error);
          return false;
        }
        patch.handle = res.handle;
      }
      if (Object.keys(patch).length === 0) return true;

      setSaving(true);
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      setSaving(false);
      if (error) {
        setError(
          error.code === "23505"
            ? "That handle is already taken."
            : error.message,
        );
        return false;
      }
      await load();
      return true;
    },
    [userId, load],
  );

  // Set the age band from a birthdate (server derives + stores the band only).
  // Returns the band, or null on failure. A minor is auto-forced private by the DB.
  const setAge = useCallback(
    async (iso: string): Promise<AgeBand | null> => {
      if (!userId) return null;
      setError(null);
      const { data, error } = await supabase.rpc("set_age_band", { _birthdate: iso });
      if (error) {
        setError(error.message);
        return null;
      }
      await load();
      return (data as AgeBand) ?? null;
    },
    [userId, load],
  );

  return { profile, ageBand, isModerator, suspended, loading, saving, error, save, setAge, refresh: load };
}
