import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { MemberStep, StepKey } from "@/types";

// The current member's checklist steps (member_steps). `version` bumps to refetch
// after a travel-proof or money action elsewhere on the screen completes a step.
export function useMemberSteps(
  tripId: string | undefined,
  userId: string | undefined,
  version = 0,
) {
  const [steps, setSteps] = useState<Map<StepKey, MemberStep>>(new Map());
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
      .from("member_steps")
      .select("*")
      .eq("trip_id", tripId)
      .eq("user_id", userId);
    if (error) setError(error.message);
    else {
      const m = new Map<StepKey, MemberStep>();
      ((data ?? []) as MemberStep[]).forEach((s) => m.set(s.step, s));
      setSteps(m);
    }
    setLoading(false);
  }, [tripId, userId]);

  useEffect(() => {
    load();
  }, [load, version]);

  return { steps, loading, error, refresh: load };
}
