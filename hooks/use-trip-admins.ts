import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";

// Promote/demote admins. The MAX 3 admins per trip (D8) is enforced by a DB
// trigger (enforce_max_admins) — promoting a 4th raises, which we surface as a
// clear message. RLS: trip_admins + trip_members writes require is_trip_admin.
export function useTripAdmins(tripId: string | undefined) {
  const [saving, setSaving] = useState<string | null>(null); // user_id in flight
  const [error, setError] = useState<string | null>(null);

  const promote = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!tripId) return false;
      setSaving(userId);
      setError(null);
      const { error: aErr } = await supabase
        .from("trip_admins")
        .insert({ trip_id: tripId, user_id: userId });
      if (aErr) {
        setSaving(null);
        // The max-3 trigger raises "...at most 3 admins (D8)".
        setError(
          /most 3|at most|admins/i.test(aErr.message)
            ? "Admin limit reached — a trip can have at most 3 admins (D8)."
            : aErr.message,
        );
        return false;
      }
      const { error: rErr } = await supabase
        .from("trip_members")
        .update({ role: "admin" })
        .eq("trip_id", tripId)
        .eq("user_id", userId);
      setSaving(null);
      if (rErr) {
        setError(rErr.message);
        return false;
      }
      return true;
    },
    [tripId],
  );

  const demote = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!tripId) return false;
      setSaving(userId);
      setError(null);
      const { error: aErr } = await supabase
        .from("trip_admins")
        .delete()
        .eq("trip_id", tripId)
        .eq("user_id", userId);
      if (aErr) {
        setSaving(null);
        setError(aErr.message);
        return false;
      }
      const { error: rErr } = await supabase
        .from("trip_members")
        .update({ role: "member" })
        .eq("trip_id", tripId)
        .eq("user_id", userId);
      setSaving(null);
      if (rErr) {
        setError(rErr.message);
        return false;
      }
      return true;
    },
    [tripId],
  );

  return { promote, demote, saving, error };
}
