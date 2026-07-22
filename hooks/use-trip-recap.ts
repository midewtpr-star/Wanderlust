import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TripRecap, TripStats } from "@/types";

// Loads the stored recap and saves (upsert one-per-trip). Generate is limited to
// members by RLS. collagePath is a private trip-media path (or null → stats-only).
export function useTripRecap(tripId: string | undefined) {
  const [recap, setRecap] = useState<TripRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("trip_recap")
      .select("*")
      .eq("trip_id", tripId)
      .maybeSingle();
    setRecap((data as TripRecap) ?? null);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (stats: TripStats, collagePath: string | null): Promise<boolean> => {
      if (!tripId) return false;
      setSaving(true);
      setError(null);
      const { error } = await supabase.from("trip_recap").upsert(
        {
          trip_id: tripId,
          stats,
          collage_url: collagePath,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "trip_id" },
      );
      setSaving(false);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [tripId, load],
  );

  return { recap, loading, saving, error, save, refresh: load };
}
