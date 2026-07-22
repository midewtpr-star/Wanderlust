import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RsvpStatus } from "@/types";

// The current user's RSVP for a trip. setStatus upserts optimistically.
export function useRsvp(tripId: string | undefined, userId: string | undefined) {
  const [status, setStatusState] = useState<RsvpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tripId || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("rsvps")
      .select("status")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();
    setStatusState((data?.status as RsvpStatus) ?? null);
    setLoading(false);
  }, [tripId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = useCallback(
    async (next: RsvpStatus): Promise<boolean> => {
      if (!tripId || !userId) return false;
      const prev = status;
      setStatusState(next); // optimistic
      setSaving(true);
      const { error } = await supabase.from("rsvps").upsert(
        {
          trip_id: tripId,
          user_id: userId,
          status: next,
          responded_at: new Date().toISOString(),
        },
        { onConflict: "trip_id,user_id" },
      );
      setSaving(false);
      if (error) {
        setStatusState(prev); // revert
        return false;
      }
      return true;
    },
    [tripId, userId, status],
  );

  return { status, setStatus, loading, saving };
}
