import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import { useTheme } from "@/lib/theme-provider";
import { resolveThemeAccent } from "@/lib/theme-color";
import { curatedTheme } from "@/constants/destination-themes";
import type { Trip, TripTheme } from "@/types";

// Small module cache so navigating between a trip's screens themes instantly
// (the theme + the member's opt-out rarely change).
type CacheEntry = { theme: TripTheme | null; usePref: boolean };
const cache = new Map<string, CacheEntry>();
export function invalidateTripTheme(tripId: string) {
  cache.delete(tripId);
}

// Resolves the EFFECTIVE theme for the current user + trip + scheme, applying
// precedence: destination theming is ON by default, but the per-trip opt-out and
// the global "always use my own accent" both win (user choice always wins).
export function useTripTheme(tripId: string | undefined) {
  const { scheme, forceOwnAccent } = useTheme();
  const { user } = useAuth();
  const [entry, setEntry] = useState<CacheEntry | null>(() =>
    tripId ? cache.get(tripId) ?? null : null,
  );
  const [loaded, setLoaded] = useState<boolean>(() =>
    tripId ? cache.has(tripId) : false,
  );

  const load = useCallback(async () => {
    if (!tripId || !user) return;
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from("trips").select("theme").eq("id", tripId).maybeSingle(),
      supabase
        .from("trip_members")
        .select("use_destination_theme")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    const next: CacheEntry = {
      theme: (t?.theme ?? null) as TripTheme | null,
      usePref: m?.use_destination_theme ?? true,
    };
    cache.set(tripId, next);
    setEntry(next);
    setLoaded(true);
  }, [tripId, user]);

  useEffect(() => {
    if (tripId && cache.has(tripId)) {
      setEntry(cache.get(tripId)!); // instant
      setLoaded(true);
    }
    load(); // refresh in the background
  }, [tripId, load]);

  const theme = entry?.theme ?? null;
  const usePref = entry?.usePref ?? true;
  const wants = !!theme && usePref && !forceOwnAccent;

  const resolved = useMemo(
    () => (wants && theme ? resolveThemeAccent(theme.primary, scheme) : null),
    [wants, theme, scheme],
  );

  const setUsePref = useCallback(
    async (value: boolean) => {
      if (!tripId) return;
      const next: CacheEntry = { theme, usePref: value };
      cache.set(tripId, next);
      setEntry(next);
      await supabase.rpc("set_trip_theme_pref", {
        _trip_id: tripId,
        _use: value,
      });
    },
    [tripId, theme],
  );

  return {
    theme,
    loaded,
    applied: !!resolved, // resolved is null for an invalid color → falls back
    usePref,
    ink: resolved?.ink ?? null,
    fill: resolved?.fill ?? null,
    fg: resolved?.fg ?? null,
    scheme,
    refresh: load,
    setUsePref,
  };
}

// Generates + caches a trip's theme, in priority order: cover image (server
// extraction) → curated map (client) → LLM (edge fn). Returns the saved theme,
// or null (caller keeps the default Trippl accent). Never throws.
export function useGenerateTheme() {
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(async (trip: Trip): Promise<TripTheme | null> => {
    setGenerating(true);
    try {
      const dest = trip.location_city;
      let theme: TripTheme | null = null;

      // 1) Cover image — the most on-brand source.
      if (trip.cover_url) {
        const { data } = await supabase.functions.invoke<{
          ok: boolean;
          theme?: TripTheme;
        }>("generate-destination-theme", {
          body: { cover_url: trip.cover_url, destination: dest },
        });
        if (data?.ok && data.theme) {
          const t = data.theme;
          // Keep the cover's colors but prefer a curated motif for a known city.
          const motif = curatedTheme(dest)?.motif ?? t.motif;
          theme = {
            primary: t.primary,
            secondary: t.secondary,
            surface_tint: t.surface_tint,
            motif,
            source: "cover_image",
          };
        }
      }

      // 2) Curated map (instant, offline).
      if (!theme) {
        const c = curatedTheme(dest);
        if (c) theme = { ...c, source: "curated" };
      }

      // 3) LLM fallback.
      if (!theme && dest) {
        const { data } = await supabase.functions.invoke<{
          ok: boolean;
          theme?: TripTheme;
        }>("generate-destination-theme", { body: { destination: dest } });
        if (data?.ok && data.theme) {
          theme = { ...data.theme, source: "generated" };
        }
      }

      if (theme && trip.id) {
        await supabase.rpc("save_trip_theme", {
          _trip_id: trip.id,
          _theme: theme,
        });
        invalidateTripTheme(trip.id);
      }
      return theme;
    } catch {
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  // Save a specific theme (manual override or a picked variant).
  const saveTheme = useCallback(
    async (tripId: string, theme: TripTheme): Promise<boolean> => {
      const { error } = await supabase.rpc("save_trip_theme", {
        _trip_id: tripId,
        _theme: theme,
      });
      invalidateTripTheme(tripId);
      return !error;
    },
    [],
  );

  return { generate, saveTheme, generating };
}
