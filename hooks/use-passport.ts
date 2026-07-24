import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import { METERS_PER_MILE } from "@/lib/geo";
import { resolveGeo } from "@/constants/geo";

// A lifetime passport, DERIVED-ONLY from the user's own existing data (completed
// trips, activities, their verified flight proofs, their opt-in distances) matched
// against the curated landmarks. Computed live so deleting a trip lowers the counts
// on the next load; the snapshot is materialized into passport_stats.

export type PassportStats = {
  trips: number;
  places: number;
  countries: number;
  continents: number;
  airports: number;
  landmarks: number;
  miles: number;
  days: number;
  started_on: string | null;
};

export type PassportPin = { lat: number; lng: number; label: string; kind: "place" | "landmark" };

const ZERO: PassportStats = {
  trips: 0, places: 0, countries: 0, continents: 0, airports: 0, landmarks: 0, miles: 0, days: 0, started_on: null,
};

function tripDays(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const s = new Date(`${start}T00:00:00`).getTime();
  const e = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

type TripRow = {
  id: string;
  location_city: string | null;
  location_lat: number | null;
  location_lng: number | null;
  start_date: string | null;
  end_date: string | null;
};
type Landmark = { name: string; aliases: string[]; lat: number; lng: number; country_code: string };

export function usePassport() {
  const { user } = useAuth();
  const userId = user?.id;
  const [stats, setStats] = useState<PassportStats>(ZERO);
  const [pins, setPins] = useState<PassportPin[]>([]);
  const [milesCoverage, setMilesCoverage] = useState<{ tracked: number; total: number }>({ tracked: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: tripData } = await supabase
      .from("trips")
      .select("id, location_city, location_lat, location_lng, start_date, end_date")
      .eq("status", "completed");
    const trips = (tripData ?? []) as TripRow[];
    const tripIds = trips.map((t) => t.id);

    if (tripIds.length === 0) {
      setStats(ZERO);
      setPins([]);
      setMilesCoverage({ tracked: 0, total: 0 });
      setLoading(false);
      return;
    }

    const [actsRes, proofsRes, distRes, lmRes] = await Promise.all([
      supabase.from("activities").select("title, location").in("trip_id", tripIds),
      supabase
        .from("travel_proofs")
        .select("arrival_airport")
        .eq("user_id", userId)
        .eq("type", "flight")
        .eq("verified", true)
        .in("trip_id", tripIds),
      supabase.from("trip_distances").select("trip_id, meters").eq("user_id", userId).in("trip_id", tripIds),
      supabase.from("landmarks").select("name, aliases, lat, lng, country_code"),
    ]);

    const activities = (actsRes.data ?? []) as { title: string | null; location: string | null }[];
    const proofs = (proofsRes.data ?? []) as { arrival_airport: string | null }[];
    const dists = (distRes.data ?? []) as { trip_id: string; meters: number }[];
    const landmarks = (lmRes.data ?? []) as Landmark[];

    // places + countries + continents + pins from destinations
    const placeKeys = new Set<string>();
    const countries = new Set<string>();
    const continents = new Set<string>();
    const pinList: PassportPin[] = [];
    let started: string | null = null;
    let days = 0;
    for (const t of trips) {
      if (t.start_date && (!started || t.start_date < started)) started = t.start_date;
      days += tripDays(t.start_date, t.end_date);
      if (typeof t.location_lat === "number" && typeof t.location_lng === "number") {
        const key = `${t.location_lat.toFixed(1)},${t.location_lng.toFixed(1)}`;
        if (!placeKeys.has(key)) {
          placeKeys.add(key);
          pinList.push({ lat: t.location_lat, lng: t.location_lng, label: t.location_city ?? "Trip", kind: "place" });
        }
      } else if (t.location_city) {
        placeKeys.add(t.location_city.toLowerCase());
      }
      const geo = resolveGeo(t.location_city, t.location_lat, t.location_lng);
      if (geo) {
        countries.add(geo.countryCode);
        continents.add(geo.continent);
      }
    }

    // airports from the user's own verified flight proofs
    const airports = new Set<string>();
    for (const p of proofs) {
      if (p.arrival_airport) airports.add(p.arrival_airport.trim().toUpperCase());
    }

    // landmarks: name-match activities against the curated set
    const actText = activities
      .map((a) => `${a.title ?? ""} ${a.location ?? ""}`.toLowerCase())
      .join(" | ");
    const visitedLandmarks = new Set<string>();
    for (const lm of landmarks) {
      const names = [lm.name, ...(lm.aliases ?? [])].map((n) => n.toLowerCase());
      if (names.some((n) => n && actText.includes(n))) {
        visitedLandmarks.add(lm.name);
        pinList.push({ lat: lm.lat, lng: lm.lng, label: lm.name, kind: "landmark" });
      }
    }

    // miles from the user's own opt-in distances (+ coverage across their trips)
    const totalMeters = dists.reduce((sum, d) => sum + (Number(d.meters) || 0), 0);
    const miles = Math.round(totalMeters / METERS_PER_MILE);

    const computed: PassportStats = {
      trips: trips.length,
      places: placeKeys.size,
      countries: countries.size,
      continents: continents.size,
      airports: airports.size,
      landmarks: visitedLandmarks.size,
      miles,
      days,
      started_on: started,
    };

    setStats(computed);
    setPins(pinList);
    setMilesCoverage({ tracked: dists.length, total: trips.length });
    setLoading(false);

    // Materialize the snapshot (best-effort; the live values above are the source of truth).
    supabase
      .from("passport_stats")
      .upsert({ user_id: userId, ...computed, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, pins, milesCoverage, loading, empty: !loading && stats.trips === 0, refresh: load };
}
