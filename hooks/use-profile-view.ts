import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import type {
  ConnectionState,
  PassportSummary,
  ProfileOverview,
  ProvenanceTrip,
  PublicProfile,
} from "@/types";

const PROFILE_SELECT = "id, display_name, handle, avatar_url, bio, home_city, visibility";
const PASSPORT_SELECT =
  "trips, places, countries, continents, airports, landmarks, miles, days, started_on";

// View ANOTHER user's world profile, composed: identity + how-we're-connected
// (shared trips + mutual count) + their outward passport summary — plus the
// relationship actions. Every read is RLS-gated: a private profile we aren't
// connected to simply doesn't load (notViewable), and NONE of this ever touches
// trip content — provenance only lists trips WE are also in.
export function useProfileView(otherId: string | undefined) {
  const { user } = useAuth();
  const isSelf = !!otherId && otherId === user?.id;

  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [state, setState] = useState<ConnectionState>("none");
  const [loading, setLoading] = useState(true);
  const [notViewable, setNotViewable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!otherId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNotViewable(false);

    // Relationship first — it's meaningful even when the profile row is hidden.
    const stateRes = await supabase.rpc("connection_state_with", { _other: otherId });
    const rel = (stateRes.data as ConnectionState) ?? "none";
    setState(rel);

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", otherId)
      .maybeSingle();
    if (pErr) setError(pErr.message);

    if (!profile) {
      setOverview(null);
      setNotViewable(true);
      setLoading(false);
      return;
    }

    const [prov, mutual, passport] = await Promise.all([
      supabase.rpc("get_profile_provenance", { _other: otherId }),
      supabase.rpc("mutual_connection_count", { _other: otherId }),
      supabase.from("passport_stats").select(PASSPORT_SELECT).eq("user_id", otherId).maybeSingle(),
    ]);

    setOverview({
      profile: profile as PublicProfile,
      state: rel,
      provenance: (prov.data as ProvenanceTrip[]) ?? [],
      mutualCount: (mutual.data as number) ?? 0,
      passport: (passport.data as PassportSummary | null) ?? null,
    });
    setLoading(false);
  }, [otherId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = useCallback(
    async (fn: string, args: Record<string, unknown>): Promise<boolean> => {
      setError(null);
      const { error } = await supabase.rpc(fn, args);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [load],
  );

  return {
    overview,
    state,
    isSelf,
    loading,
    notViewable,
    error,
    connect: () => act("send_connection_request", { _other: otherId }),
    accept: () => act("respond_connection_request", { _other: otherId, _accept: true }),
    decline: () => act("respond_connection_request", { _other: otherId, _accept: false }),
    remove: () => act("remove_connection", { _other: otherId }),
    block: () => act("set_connection_block", { _other: otherId, _blocked: true }),
    unblock: () => act("set_connection_block", { _other: otherId, _blocked: false }),
    refresh: load,
  };
}
