import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { supabase } from "@/lib/supabase";
import { haversineMeters } from "@/lib/geo";
import type { DistanceSummary } from "@/types";

// Opt-in distance tracking for the recap's "miles covered" stat. FOREGROUND
// updates only (MVP) — accumulates while the screen is open and tracking is on.
//
// TODO (Phase 2 — background tracking): request Location.requestBackground
// PermissionsAsync(), register a TaskManager task, and call
// Location.startLocationUpdatesAsync(taskName, {...}); add UIBackgroundModes
// "location" (iOS) + a foreground service (Android) in app.config. Then distance
// accrues even when the app is backgrounded during the trip.
export function useTripDistance(
  tripId: string | undefined,
  userId: string | undefined,
  withinWindow: boolean,
) {
  const [optedIn, setOptedIn] = useState(false);
  const [summary, setSummary] = useState<DistanceSummary | null>(null);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subRef = useRef<Location.LocationSubscription | null>(null);
  const lastRef = useRef<{ lat: number; lng: number } | null>(null);
  const metersRef = useRef(0);
  const pendingRef = useRef(0);

  const persist = useCallback(
    async (meters: number, opted: boolean) => {
      if (!tripId || !userId) return;
      await supabase.from("trip_distances").upsert(
        {
          trip_id: tripId,
          user_id: userId,
          opted_in: opted,
          meters,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "trip_id,user_id" },
      );
    },
    [tripId, userId],
  );

  const load = useCallback(async () => {
    if (!tripId || !userId) {
      setLoading(false);
      return;
    }
    const [rowRes, sumRes] = await Promise.all([
      supabase
        .from("trip_distances")
        .select("opted_in, meters")
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.rpc("get_trip_distance_summary", { _trip_id: tripId }),
    ]);
    const row = (rowRes.data as { opted_in: boolean; meters: number } | null) ?? null;
    setOptedIn(row?.opted_in ?? false);
    metersRef.current = Number(row?.meters ?? 0);
    setSummary(
      ((sumRes.data ?? []) as DistanceSummary[])[0] ?? {
        total_meters: 0,
        tracked_count: 0,
        member_count: 0,
      },
    );
    setLoading(false);
  }, [tripId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const stopTracking = useCallback(async () => {
    subRef.current?.remove();
    subRef.current = null;
    lastRef.current = null;
    setTracking(false);
    await persist(metersRef.current, true);
    await load();
  }, [persist, load]);

  const startTracking = useCallback(async (): Promise<boolean> => {
    if (subRef.current) return true; // already tracking
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is needed to track distance.");
        return false;
      }
      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25,
          timeInterval: 5000,
        },
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (lastRef.current) {
            const m = haversineMeters(
              lastRef.current.lat,
              lastRef.current.lng,
              latitude,
              longitude,
            );
            // Ignore GPS jitter (<5m) and implausible jumps (>5km between pings).
            if (m > 5 && m < 5000) {
              metersRef.current += m;
              pendingRef.current += m;
              if (pendingRef.current > 100) {
                pendingRef.current = 0;
                void persist(metersRef.current, true);
              }
            }
          }
          lastRef.current = { lat: latitude, lng: longitude };
        },
      );
      setTracking(true);
      return true;
    } catch {
      setError("Couldn't start distance tracking.");
      return false;
    }
  }, [persist]);

  const setOptIn = useCallback(
    async (on: boolean) => {
      setError(null);
      setOptedIn(on);
      await persist(metersRef.current, on);
      if (on) {
        if (withinWindow) await startTracking();
      } else {
        await stopTracking();
      }
      await load();
    },
    [persist, startTracking, stopTracking, withinWindow, load],
  );

  // Clean up the subscription on unmount.
  useEffect(() => {
    return () => {
      subRef.current?.remove();
      subRef.current = null;
    };
  }, []);

  return {
    optedIn,
    summary,
    tracking,
    myMeters: metersRef.current,
    loading,
    error,
    setOptIn,
    startTracking,
    stopTracking,
    refresh: load,
  };
}
