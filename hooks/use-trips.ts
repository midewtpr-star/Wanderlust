import { useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Trip } from "@/types";

// Lists the trips the current user belongs to. RLS (is_trip_member) already scopes
// `trips` to the caller's memberships, so a plain select returns only their trips.
export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const fetchTrips = useCallback(async () => {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("start_date", { ascending: true, nullsFirst: false });
    if (error) setError(error.message);
    else {
      setError(null);
      setTrips((data ?? []) as Trip[]);
    }
  }, []);

  // Loads with a skeleton the first time, silently on subsequent focuses.
  const reload = useCallback(async () => {
    if (!loadedOnce.current) {
      setLoading(true);
      await fetchTrips();
      setLoading(false);
      loadedOnce.current = true;
    } else {
      await fetchTrips();
    }
  }, [fetchTrips]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  }, [fetchTrips]);

  return { trips, loading, refreshing, error, reload, refresh };
}
