import { useState } from "react";
import { supabase } from "@/lib/supabase";

// Joins a trip via a valid invite code (SECURITY DEFINER join_trip RPC). Returns
// the trip id on success.
export function useJoinTrip() {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(code: string): Promise<string | null> {
    setJoining(true);
    setError(null);
    const { data, error } = await supabase.rpc("join_trip", { _code: code });
    setJoining(false);
    if (error) {
      setError(error.message);
      return null;
    }
    return data as string;
  }

  return { join, joining, error };
}
