import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TravelStatusRow } from "@/types";

// Non-PII per-member travel status for the whole trip (get_travel_status RPC,
// gated to members). Also exposes the admin manual-override RPC.
export function useTravelStatus(tripId: string | undefined) {
  const [statuses, setStatuses] = useState<Map<string, TravelStatusRow>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("get_travel_status", {
      _trip_id: tripId,
    });
    if (error) setError(error.message);
    else {
      const m = new Map<string, TravelStatusRow>();
      ((data ?? []) as TravelStatusRow[]).forEach((r) => m.set(r.user_id, r));
      setStatuses(m);
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  // Admin manual override for a member (SECURITY DEFINER RPC checks is_trip_admin).
  const override = useCallback(
    async (memberUserId: string): Promise<boolean> => {
      if (!tripId) return false;
      const { error } = await supabase.rpc("admin_override_travel_proof", {
        _trip_id: tripId,
        _user_id: memberUserId,
      });
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [tripId, load],
  );

  return { statuses, loading, error, refresh: load, override };
}
