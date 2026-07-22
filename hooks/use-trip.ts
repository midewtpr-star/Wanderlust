import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Trip } from "@/types";

// Loads a single trip. RLS hides trips the user isn't a member of, so an empty
// result means "not a member or doesn't exist" → not authorized.
export function useTrip(id: string | undefined) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notAuthorized, setNotAuthorized] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setNotAuthorized(true);
      return;
    }
    setLoading(true);
    setError(null);
    setNotAuthorized(false);
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) setError(error.message);
    else if (!data) setNotAuthorized(true);
    else setTrip(data as Trip);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { trip, loading, error, notAuthorized, refresh: load };
}
