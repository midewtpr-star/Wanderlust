import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import { getMusicProvider, clampTrimStart, clipEnd, DEFAULT_CLIP_MS, type Track } from "@/lib/music";
import type { ShareAudio } from "@/types";

const SELECT = "trip_id, provider_id, track_id, title, artist, license, trim_start_ms, trim_end_ms";

// The trip's chosen share music (or none) + the active catalogue provider. The
// provider is null when the operator hasn't configured one (the shipped default),
// which the picker surfaces as a clear "not configured" state.
export function useShareMusic(tripId: string | undefined) {
  const { user } = useAuth();
  const provider = getMusicProvider();
  const [current, setCurrent] = useState<ShareAudio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("share_audio").select(SELECT).eq("trip_id", tripId).maybeSingle();
    setCurrent((data as ShareAudio) ?? null);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  // Choose (or re-trim) a track for this trip's share. Rights metadata is stored
  // with it, ready for the future video export to bake in.
  const setMusic = useCallback(
    async (track: Track, trimStartMs: number): Promise<boolean> => {
      if (!tripId || !user) return false;
      setError(null);
      const start = clampTrimStart(trimStartMs, track.durationMs);
      const end = clipEnd(start, track.durationMs, DEFAULT_CLIP_MS);
      const { error } = await supabase.from("share_audio").upsert(
        {
          trip_id: tripId,
          chosen_by: user.id,
          provider_id: track.providerId,
          track_id: track.id,
          title: track.title,
          artist: track.artist,
          license: track.license,
          trim_start_ms: start,
          trim_end_ms: end,
        },
        { onConflict: "trip_id" },
      );
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [tripId, user, load],
  );

  const clearMusic = useCallback(async (): Promise<boolean> => {
    if (!tripId) return false;
    setError(null);
    const { error } = await supabase.from("share_audio").delete().eq("trip_id", tripId);
    if (error) {
      setError(error.message);
      return false;
    }
    setCurrent(null);
    return true;
  }, [tripId]);

  return { provider, configured: provider !== null, current, loading, error, setMusic, clearMusic, refresh: load };
}
