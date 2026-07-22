import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { NearbyIdeasResult } from "@/types";

// Per-trip cache so navigating to the trip repeatedly doesn't re-hit the Places
// API. Module-level → survives component unmount within the session. `refresh`
// forces a re-fetch.
const cache = new Map<string, NearbyIdeasResult>();

export function useNearbyIdeas(
  tripId: string | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
) {
  const [result, setResult] = useState<NearbyIdeasResult | null>(() =>
    tripId ? cache.get(tripId) ?? null : null,
  );
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);

  const fetchIdeas = useCallback(
    async (force: boolean) => {
      if (!tripId) {
        setLoading(false);
        return;
      }
      if (!force && cache.has(tripId)) {
        setResult(cache.get(tripId)!);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.functions.invoke<NearbyIdeasResult>(
        "nearby-ideas",
        { body: { trip_id: tripId, lat: lat ?? undefined, lng: lng ?? undefined } },
      );
      if (error || !data) {
        setError("Couldn't load local ideas right now.");
        setLoading(false);
        return;
      }
      cache.set(tripId, data);
      setResult(data);
      setLoading(false);
    },
    [tripId, lat, lng],
  );

  useEffect(() => {
    fetchIdeas(false);
  }, [fetchIdeas]);

  return { result, loading, error, refresh: () => fetchIdeas(true) };
}
