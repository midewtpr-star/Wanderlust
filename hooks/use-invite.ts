import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { buildInviteLinks } from "@/lib/links";
import type { Invite } from "@/types";

// Creates or reuses a (non-expired) invite for a trip and exposes its links.
export function useInvite(tripId: string | undefined) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureInvite = useCallback(
    async (userId: string): Promise<Invite | null> => {
      if (!tripId) return null;
      setLoading(true);
      setError(null);
      try {
        const { data: existing, error: readErr } = await supabase
          .from("invites")
          .select("*")
          .eq("trip_id", tripId)
          .order("created_at", { ascending: false });
        if (readErr) throw readErr;

        const now = Date.now();
        let row = (existing as Invite[] | null)?.find(
          (inv) => !inv.expires_at || new Date(inv.expires_at).getTime() > now,
        );

        if (!row) {
          const { data: created, error: insErr } = await supabase
            .from("invites")
            .insert({ trip_id: tripId, invited_by: userId })
            .select()
            .single();
          if (insErr) throw insErr;
          row = created as Invite;
        }

        setInvite(row);
        return row;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create an invite.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [tripId],
  );

  const links = invite ? buildInviteLinks(invite.code) : null;
  return { invite, links, ensureInvite, loading, error };
}
