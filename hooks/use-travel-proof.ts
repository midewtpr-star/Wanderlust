import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TravelProof } from "@/types";

// The current user's travel proof for a trip (one row, unique per trip+user).
// confirmDriving is the instant self-verify path (no upload, no AI).
export function useTravelProof(
  tripId: string | undefined,
  userId: string | undefined,
) {
  const [proof, setProof] = useState<TravelProof | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("travel_proofs")
      .select("*")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) setError(error.message);
    else setProof((data as TravelProof) ?? null);
    setLoading(false);
  }, [tripId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Driving path: upsert a verified driving proof + mark the travel_proof step
  // complete. RLS lets a member write their own proof + their own member_steps.
  const confirmDriving = useCallback(
    async (note: string): Promise<boolean> => {
      if (!tripId || !userId) return false;
      const nowIso = new Date().toISOString();
      const { error: pErr } = await supabase.from("travel_proofs").upsert(
        {
          trip_id: tripId,
          user_id: userId,
          type: "driving",
          note: note.trim() || null,
          verified: true,
          verified_at: nowIso,
          verified_by: null,
          // clear any prior flight attempt if switching methods
          passenger_name: null,
          confirmation_number: null,
          arrival_airport: null,
          arrival_city: null,
          travel_dates: null,
          file_url: null,
        },
        { onConflict: "trip_id,user_id" },
      );
      if (pErr) {
        setError(pErr.message);
        return false;
      }
      const { error: sErr } = await supabase.from("member_steps").upsert(
        {
          trip_id: tripId,
          user_id: userId,
          step: "travel_proof",
          completed: true,
          completed_at: nowIso,
        },
        { onConflict: "trip_id,user_id,step" },
      );
      if (sErr) {
        setError(sErr.message);
        return false;
      }
      await load();
      return true;
    },
    [tripId, userId, load],
  );

  return { proof, loading, error, confirmDriving, refresh: load };
}
