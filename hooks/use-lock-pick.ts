import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AirbnbOption } from "@/types";

// Admin-only (RLS: trips_update = is_trip_admin). Locking sets the official pick
// + status='locked'; unlocking reverts to 'planning'. On lock, seed the Airbnb
// money pool total from the picked option IF an admin hasn't set it manually.
export function useLockPick(tripId: string | undefined) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lock = useCallback(
    async (option: AirbnbOption, startDate: string | null): Promise<boolean> => {
      if (!tripId) return false;
      setSaving(true);
      setError(null);

      // Feed the money phase: populate the Airbnb pool total from the locked
      // option's total_cost, unless an admin already set a total manually.
      const { data: pool } = await supabase
        .from("money_pools")
        .select("id, total_cents")
        .eq("trip_id", tripId)
        .eq("type", "airbnb")
        .maybeSingle();
      const poolUnset = !pool || pool.total_cents == null;
      if (poolUnset && option.total_cost != null) {
        await supabase.from("money_pools").upsert(
          {
            trip_id: tripId,
            type: "airbnb",
            total_cents: Math.round(option.total_cost * 100),
            unlock_date: startDate,
          },
          { onConflict: "trip_id,type" },
        );
      }

      const { error } = await supabase
        .from("trips")
        .update({ airbnb_pick: option.id, status: "locked" })
        .eq("id", tripId);
      setSaving(false);
      if (error) {
        setError(error.message);
        return false;
      }
      return true;
    },
    [tripId],
  );

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!tripId) return false;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("trips")
      .update({ airbnb_pick: null, status: "planning" })
      .eq("id", tripId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }, [tripId]);

  return { lock, unlock, saving, error };
}
