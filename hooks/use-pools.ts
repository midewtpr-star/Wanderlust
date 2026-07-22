import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { MoneyPool, PoolContribution, PoolType } from "@/types";

// Loads a trip's money pools + all contributions (members may read group progress
// per RLS) so pool cards can compute totals, per-person shares, and paid lists.
// Also surfaces the Airbnb total suggested by the locked pick, if one is set
// (voting/lock is a later phase; until then admins type the total).
export function usePools(
  tripId: string | undefined,
  airbnbPickId: string | null | undefined,
) {
  const [pools, setPools] = useState<MoneyPool[]>([]);
  const [contribs, setContribs] = useState<PoolContribution[]>([]);
  const [suggestedAirbnbCents, setSuggestedAirbnbCents] = useState<number | null>(
    null,
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
    const [poolsRes, contribRes] = await Promise.all([
      supabase.from("money_pools").select("*").eq("trip_id", tripId),
      supabase.from("pool_contributions").select("*").eq("trip_id", tripId),
    ]);
    if (poolsRes.error || contribRes.error) {
      setError((poolsRes.error ?? contribRes.error)!.message);
      setLoading(false);
      return;
    }
    setPools((poolsRes.data ?? []) as MoneyPool[]);
    setContribs((contribRes.data ?? []) as PoolContribution[]);

    if (airbnbPickId) {
      const { data } = await supabase
        .from("airbnb_options")
        .select("total_cost")
        .eq("id", airbnbPickId)
        .maybeSingle();
      const dollars = (data?.total_cost as number | null) ?? null;
      setSuggestedAirbnbCents(dollars != null ? Math.round(dollars * 100) : null);
    } else {
      setSuggestedAirbnbCents(null);
    }
    setLoading(false);
  }, [tripId, airbnbPickId]);

  useEffect(() => {
    load();
  }, [load]);

  // Admin only (enforced by RLS): create/update a pool's total + unlock date.
  const setPoolTotal = useCallback(
    async (
      type: PoolType,
      totalCents: number,
      unlockDate: string | null,
    ): Promise<boolean> => {
      if (!tripId) return false;
      const { error } = await supabase.from("money_pools").upsert(
        { trip_id: tripId, type, total_cents: totalCents, unlock_date: unlockDate },
        { onConflict: "trip_id,type" },
      );
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [tripId, load],
  );

  const contributionsFor = useCallback(
    (poolId: string) => contribs.filter((c) => c.pool_id === poolId),
    [contribs],
  );

  return {
    pools,
    contribs,
    contributionsFor,
    suggestedAirbnbCents,
    loading,
    error,
    setPoolTotal,
    refresh: load,
  };
}
