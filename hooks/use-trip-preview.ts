import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TripPreview } from "@/types";

// Minimal invite preview via the trip_preview RPC (works while signed out).
export function useTripPreview(code: string | undefined) {
  const [preview, setPreview] = useState<TripPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!code) {
      setLoading(false);
      setError("Missing invite code.");
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("trip_preview", { _code: code });
    if (error) setError(error.message);
    else if (!data || (data as TripPreview[]).length === 0)
      setError("This invite is invalid or has expired.");
    else setPreview((data as TripPreview[])[0]);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  return { preview, loading, error, refresh: load };
}
