import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { StepKey } from "@/types";

export type MemberVerification = {
  verified: boolean;
  completed: number;
  required: number;
};

// Derives each member's aggregate verification off member_steps (foundation §5):
// verified = travel_proof AND airbnb_paid AND (car_paid only when the trip has a
// car pool). member_steps is member-readable (RLS), so a member sees the whole
// group's status. `version` bumps to refetch after a step completes elsewhere.
export function useMemberVerification(
  tripId: string | undefined,
  hasCarPool: boolean,
  version = 0,
) {
  const [byUser, setByUser] = useState<Map<string, MemberVerification>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requiredSteps = useMemo<StepKey[]>(() => {
    const s: StepKey[] = ["travel_proof", "airbnb_paid"];
    if (hasCarPool) s.push("car_paid");
    return s;
  }, [hasCarPool]);

  const load = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("member_steps")
      .select("user_id, step, completed")
      .eq("trip_id", tripId);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const doneByUser = new Map<string, Set<string>>();
    ((data ?? []) as { user_id: string; step: string; completed: boolean }[]).forEach(
      (r) => {
        if (!r.completed) return;
        if (!doneByUser.has(r.user_id)) doneByUser.set(r.user_id, new Set());
        doneByUser.get(r.user_id)!.add(r.step);
      },
    );
    const m = new Map<string, MemberVerification>();
    doneByUser.forEach((set, uid) => {
      const completed = requiredSteps.filter((s) => set.has(s)).length;
      m.set(uid, {
        verified: completed === requiredSteps.length,
        completed,
        required: requiredSteps.length,
      });
    });
    setByUser(m);
    setLoading(false);
  }, [tripId, requiredSteps]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, version]);

  const requiredCount = requiredSteps.length;

  // Default for members with no steps yet: 0/required, not verified.
  const statusFor = useCallback(
    (userId: string): MemberVerification =>
      byUser.get(userId) ?? {
        verified: false,
        completed: 0,
        required: requiredCount,
      },
    [byUser, requiredCount],
  );

  const verifiedCount = useMemo(
    () => [...byUser.values()].filter((v) => v.verified).length,
    [byUser],
  );

  return { byUser, statusFor, requiredCount, verifiedCount, loading, error, refresh: load };
}
