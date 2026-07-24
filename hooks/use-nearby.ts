import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import { useMyProfile } from "@/hooks/use-profile";
import { areaGeohash, nearbyEligible } from "@/lib/nearby";
import type { NearbyTraveler } from "@/types";

type TripArea = {
  city: string | null;
  lat: number | null;
  lng: number | null;
  start: string | null;
  end: string | null;
};

// Per-trip Nearby: my opt-in state + eligibility + the matched travelers. OFF by
// default (a row exists only after an explicit opt-in). The area is derived from
// the trip's PUBLIC destination — this hook never touches device location.
export function useNearby(tripId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;
  const { ageBand, suspended } = useMyProfile();

  const [trip, setTrip] = useState<TripArea | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [travelers, setTravelers] = useState<NearbyTraveler[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [{ data: t }, { data: mine }] = await Promise.all([
      supabase
        .from("trips")
        .select("location_city, location_lat, location_lng, start_date, end_date")
        .eq("id", tripId)
        .maybeSingle(),
      supabase
        .from("discovery_optins")
        .select("id")
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    setTrip(
      t
        ? {
            city: t.location_city,
            lat: t.location_lat,
            lng: t.location_lng,
            start: t.start_date,
            end: t.end_date,
          }
        : null,
    );
    const on = !!mine;
    setEnabled(on);
    if (on) {
      const { data } = await supabase.rpc("find_nearby_travelers", { _trip_id: tripId });
      setTravelers((data as NearbyTraveler[]) ?? []);
    } else {
      setTravelers([]);
    }
    setLoading(false);
  }, [tripId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const eligible = nearbyEligible(ageBand, suspended);
  const hasArea = trip?.lat != null && trip?.lng != null;

  // Turn Nearby on/off for this trip. On → derive the coarse area geohash from
  // the trip destination and opt in; off → delete the opt-in (immediate removal).
  const toggle = useCallback(
    async (on: boolean): Promise<boolean> => {
      if (!tripId) return false;
      setBusy(true);
      setError(null);
      const geo = trip && trip.lat != null && trip.lng != null ? areaGeohash(trip.lat, trip.lng) : "";
      const { error } = await supabase.rpc("set_nearby_optin", {
        _trip_id: tripId,
        _area_geohash: geo,
        _enabled: on,
      });
      setBusy(false);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [tripId, trip, load],
  );

  return {
    enabled,
    eligible,
    hasArea,
    areaLabel: trip?.city ?? null,
    travelers,
    loading,
    busy,
    error,
    toggle,
    refresh: load,
  };
}
