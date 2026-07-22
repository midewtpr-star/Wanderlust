import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AirbnbOption } from "@/types";

export type AddOptionInput = {
  title: string;
  url: string;
  total_cost: number | null;
  image_url: string | null;
  notes: string | null;
};

type VoteRow = { option_id: string; user_id: string };

// Trip's Airbnb options + votes. One vote per member (unique trip_id,user_id) —
// changing your vote moves it (upsert). Voting INFORMS the admin; it does not
// auto-decide (the admin locks the official pick — see useLockPick).
export function useAirbnbVotes(
  tripId: string | undefined,
  userId: string | undefined,
) {
  const [options, setOptions] = useState<AirbnbOption[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [optRes, voteRes] = await Promise.all([
      supabase
        .from("airbnb_options")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true }),
      supabase
        .from("airbnb_votes")
        .select("option_id, user_id")
        .eq("trip_id", tripId),
    ]);
    if (optRes.error || voteRes.error) {
      setError((optRes.error ?? voteRes.error)!.message);
      setLoading(false);
      return;
    }
    setOptions((optRes.data ?? []) as AirbnbOption[]);
    setVotes((voteRes.data ?? []) as VoteRow[]);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const myVote = useMemo(
    () => votes.find((v) => v.user_id === userId)?.option_id ?? null,
    [votes, userId],
  );

  // option_id -> voter user_ids
  const votesByOption = useMemo(() => {
    const m = new Map<string, string[]>();
    votes.forEach((v) => {
      if (!m.has(v.option_id)) m.set(v.option_id, []);
      m.get(v.option_id)!.push(v.user_id);
    });
    return m;
  }, [votes]);

  const vote = useCallback(
    async (optionId: string): Promise<boolean> => {
      if (!tripId || !userId) return false;
      const { error } = await supabase.from("airbnb_votes").upsert(
        { trip_id: tripId, user_id: userId, option_id: optionId },
        { onConflict: "trip_id,user_id" },
      );
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [tripId, userId, load],
  );

  const addOption = useCallback(
    async (input: AddOptionInput): Promise<boolean> => {
      if (!tripId || !userId) return false;
      // GROUPPAD SEAM (D7) — manual option entry only. The real GroupPad
      // browse → AI-compare flow replaces this later; the seam stays at
      // airbnb_options + airbnb_votes + trips.airbnb_pick.
      const { error } = await supabase.from("airbnb_options").insert({
        trip_id: tripId,
        added_by: userId,
        title: input.title || null,
        url: input.url || null,
        total_cost: input.total_cost,
        image_url: input.image_url,
        notes: input.notes,
      });
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [tripId, userId, load],
  );

  return {
    options,
    votes,
    votesByOption,
    myVote,
    loading,
    error,
    vote,
    addOption,
    refresh: load,
  };
}
