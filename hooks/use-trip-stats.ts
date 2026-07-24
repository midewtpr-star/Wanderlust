import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { METERS_PER_MILE } from "@/lib/geo";
import type { DistanceSummary, StepKey, Trip, TripStats } from "@/types";

function tripDays(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const s = new Date(`${start}T00:00:00`).getTime();
  const e = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

// Computes the recap stats from REAL data only (no fabricated metrics). Places =
// activities with media OR a linked place; miles = opt-in group total; checklist
// = fully-verified members + total completed steps; plus cheap extras.
export function useTripStats(tripId: string | undefined, trip: Trip | null) {
  const [stats, setStats] = useState<TripStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId || !trip) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const hasCar = !!trip.car_rental_ref;
    const [actRes, mediaRes, stepsRes, membersRes, distRes, journalRes, jMediaRes] =
      await Promise.all([
        supabase.from("activities").select("id, title, location, url").eq("trip_id", tripId),
        supabase.from("activity_media").select("activity_id, media_type").eq("trip_id", tripId),
        supabase.from("member_steps").select("user_id, step, completed").eq("trip_id", tripId),
        supabase.from("trip_members").select("user_id").eq("trip_id", tripId),
        supabase.rpc("get_trip_distance_summary", { _trip_id: tripId }),
        // Release 2: the journal feeds the recap's source data.
        supabase
          .from("journal_entries")
          .select("id", { count: "exact", head: true })
          .eq("trip_id", tripId),
        supabase
          .from("journal_media")
          .select("id", { count: "exact", head: true })
          .eq("trip_id", tripId),
      ]);
    if (actRes.error || mediaRes.error || stepsRes.error || membersRes.error) {
      setError("Couldn't compute recap stats.");
      setLoading(false);
      return;
    }
    const journalEntries = journalRes.count ?? 0;
    const journalMedia = jMediaRes.count ?? 0;

    const activities = (actRes.data ?? []) as {
      id: string;
      title: string;
      location: string | null;
      url: string | null;
    }[];
    const media = (mediaRes.data ?? []) as { activity_id: string }[];
    const steps = (stepsRes.data ?? []) as {
      user_id: string;
      step: StepKey;
      completed: boolean;
    }[];
    const members = (membersRes.data ?? []) as { user_id: string }[];
    const dist =
      ((distRes.data ?? []) as DistanceSummary[])[0] ?? {
        total_meters: 0,
        tracked_count: 0,
        member_count: members.length,
      };

    const withMedia = new Set(media.map((m) => m.activity_id));
    const places = activities.filter(
      (a) => withMedia.has(a.id) || a.location || a.url,
    );

    const required: StepKey[] = ["travel_proof", "airbnb_paid"];
    if (hasCar) required.push("car_paid");
    const doneByUser = new Map<string, Set<string>>();
    let steps_completed = 0;
    steps.forEach((s) => {
      if (!s.completed) return;
      steps_completed++;
      if (!doneByUser.has(s.user_id)) doneByUser.set(s.user_id, new Set());
      doneByUser.get(s.user_id)!.add(s.step);
    });
    let verified = 0;
    let confirmed = 0;
    doneByUser.forEach((set) => {
      if (required.every((r) => set.has(r))) verified++;
      if (set.has("travel_proof")) confirmed++;
    });

    const miles = (Number(dist.total_meters) || 0) / METERS_PER_MILE;

    setStats({
      places_visited: places.length,
      place_names: places.map((a) => a.title),
      miles_covered: Math.round(miles * 10) / 10,
      miles_tracked_members: dist.tracked_count ?? 0,
      member_count: members.length,
      verified_members: verified,
      steps_completed,
      confirmed_travelers: confirmed,
      total_media: media.length + journalMedia,
      journal_entries: journalEntries,
      trip_days: tripDays(trip.start_date, trip.end_date),
    });
    setLoading(false);
  }, [tripId, trip]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, error, refresh: load };
}
