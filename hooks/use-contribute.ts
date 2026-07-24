import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PoolType } from "@/types";

type ContributeArgs = {
  poolId: string;
  poolType: PoolType;
  amountCents: number;
  shareCents: number | null; // my equal share for this pool
  paidBeforeCents: number; // my contributions before this one
};

// Logs a contribution to a pool (append-only ledger — no funds move). When the
// contribution brings my running total to or past my share, marks the pool's
// member_steps step complete (airbnb_paid / car_paid) so the checklist advances.
export function useContribute(
  tripId: string | undefined,
  userId: string | undefined,
) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contribute = useCallback(
    async ({
      poolId,
      poolType,
      amountCents,
      shareCents,
      paidBeforeCents,
    }: ContributeArgs): Promise<{ ok: boolean; stepCompleted: boolean }> => {
      if (!tripId || !userId || amountCents <= 0) {
        return { ok: false, stepCompleted: false };
      }
      setSaving(true);
      setError(null);
      const { error: insErr } = await supabase.from("pool_contributions").insert({
        pool_id: poolId,
        trip_id: tripId,
        user_id: userId,
        amount_cents: amountCents,
      });
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return { ok: false, stepCompleted: false };
      }

      let stepCompleted = false;
      const wasComplete =
        shareCents != null && shareCents > 0 && paidBeforeCents >= shareCents;
      const nowComplete =
        shareCents != null &&
        shareCents > 0 &&
        paidBeforeCents + amountCents >= shareCents;
      if (nowComplete && !wasComplete) {
        const step = poolType === "airbnb" ? "airbnb_paid" : "car_paid";
        const { error: stepErr } = await supabase.from("member_steps").upsert(
          {
            trip_id: tripId,
            user_id: userId,
            step,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "trip_id,user_id,step" },
        );
        if (!stepErr) stepCompleted = true;
      }
      setSaving(false);
      return { ok: true, stepCompleted };
    },
    [tripId, userId],
  );

  return { contribute, saving, error };
}
