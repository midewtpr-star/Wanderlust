import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PersonalSafe, SafeDeposit } from "@/types";

// A member's PRIVATE savings safe (self-only RLS — invisible to co-members).
// Ledger only: deposits are honor-system records, sealed until unlock_date.
export function usePersonalSafe(
  tripId: string | undefined,
  userId: string | undefined,
  defaultUnlockDate: string | null,
) {
  const [safe, setSafe] = useState<PersonalSafe | null>(null);
  const [deposits, setDeposits] = useState<SafeDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: s, error: sErr } = await supabase
      .from("personal_safes")
      .select("*")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();
    if (sErr) {
      setError(sErr.message);
      setLoading(false);
      return;
    }
    const safeRow = (s as PersonalSafe) ?? null;
    setSafe(safeRow);
    if (safeRow) {
      const { data: d } = await supabase
        .from("safe_deposits")
        .select("*")
        .eq("safe_id", safeRow.id)
        .order("deposited_at", { ascending: true });
      setDeposits((d ?? []) as SafeDeposit[]);
    } else {
      setDeposits([]);
    }
    setLoading(false);
  }, [tripId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const setGoal = useCallback(
    async (goalCents: number | null, unlockDate: string | null): Promise<boolean> => {
      if (!tripId || !userId) return false;
      setSaving(true);
      const { error } = await supabase.from("personal_safes").upsert(
        { trip_id: tripId, user_id: userId, goal_cents: goalCents, unlock_date: unlockDate },
        { onConflict: "trip_id,user_id" },
      );
      setSaving(false);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [tripId, userId, load],
  );

  const addDeposit = useCallback(
    async (amountCents: number): Promise<boolean> => {
      if (!tripId || !userId || amountCents <= 0) return false;
      setSaving(true);
      // Ensure the safe exists (auto-create with the trip-start default unlock).
      let safeId = safe?.id;
      if (!safeId) {
        const { data, error: cErr } = await supabase
          .from("personal_safes")
          .upsert(
            { trip_id: tripId, user_id: userId, unlock_date: defaultUnlockDate },
            { onConflict: "trip_id,user_id" },
          )
          .select("id")
          .maybeSingle();
        if (cErr || !data) {
          setError(cErr?.message ?? "Couldn't open your safe.");
          setSaving(false);
          return false;
        }
        safeId = (data as { id: string }).id;
      }
      const { error } = await supabase.from("safe_deposits").insert({
        safe_id: safeId,
        user_id: userId,
        amount_cents: amountCents,
      });
      setSaving(false);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [tripId, userId, safe, defaultUnlockDate, load],
  );

  const totalCents = useMemo(
    () => deposits.reduce((sum, d) => sum + d.amount_cents, 0),
    [deposits],
  );

  return {
    safe,
    deposits,
    totalCents,
    loading,
    saving,
    error,
    setGoal,
    addDeposit,
    refresh: load,
  };
}
