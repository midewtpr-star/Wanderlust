import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Activity, ActivityInput } from "@/types";

// A trip's activities. Any member may create (RLS: is_trip_member + created_by
// = self). Newest first.
export function useActivities(
  tripId: string | undefined,
  userId: string | undefined,
) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("trip_id", tripId)
      .order("scheduled_for", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setActivities((data ?? []) as Activity[]);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (input: ActivityInput): Promise<Activity | null> => {
      if (!tripId || !userId || !input.title.trim()) return null;
      const { data, error } = await supabase
        .from("activities")
        .insert({
          trip_id: tripId,
          created_by: userId,
          title: input.title.trim(),
          description: input.description ?? null,
          scheduled_for: input.scheduled_for ?? null,
          location: input.location ?? null,
          url: input.url ?? null,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        setError(error.message);
        return null;
      }
      await load();
      return (data as Activity) ?? null;
    },
    [tripId, userId, load],
  );

  return { activities, loading, error, create, refresh: load };
}
