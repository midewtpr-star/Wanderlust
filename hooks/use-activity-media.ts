import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  uploadTripMedia,
  signedTripMediaUrl,
  fileSize,
  MAX_MEDIA_BYTES,
  type PickedFile,
} from "@/lib/storage";
import type { ActivityMedia, MediaType } from "@/types";

export type MediaWithUrl = ActivityMedia & { signedUrl: string | null };
export type UploadItem = { file: PickedFile; caption: string; kind: MediaType };

// Media for one activity. Any trip member can view (signed URLs over the private
// bucket); a member may delete only their OWN uploads (RLS). Upload supports
// multi-select + per-item captions, a size guardrail, and per-item progress.
export function useActivityMedia(
  activityId: string | undefined,
  tripId: string | undefined,
  userId: string | undefined,
) {
  const [media, setMedia] = useState<MediaWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!activityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("activity_media")
      .select("*")
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as ActivityMedia[];
    const withUrls = await Promise.all(
      rows.map(async (m) => ({
        ...m,
        signedUrl: m.url ? await signedTripMediaUrl(m.url) : null,
      })),
    );
    setMedia(withUrls);
    setLoading(false);
  }, [activityId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = useCallback(
    async (
      items: UploadItem[],
    ): Promise<{ ok: number; skipped: string[] }> => {
      if (!tripId || !userId || !activityId || items.length === 0) {
        return { ok: 0, skipped: [] };
      }
      setError(null);
      const skipped: string[] = [];
      let ok = 0;
      setProgress({ done: 0, total: items.length });
      for (let i = 0; i < items.length; i++) {
        const { file, caption, kind } = items[i];
        const label = file.name ?? "a file";
        const size = await fileSize(file);
        if (size != null && size > MAX_MEDIA_BYTES) {
          skipped.push(`${label} (too large — max 50 MB)`);
          setProgress({ done: i + 1, total: items.length });
          continue;
        }
        try {
          const path = await uploadTripMedia(file, tripId, userId);
          const { error } = await supabase.from("activity_media").insert({
            activity_id: activityId,
            trip_id: tripId,
            uploaded_by: userId,
            media_type: kind,
            url: path,
            caption: caption.trim() || null,
          });
          if (error) throw error;
          ok++;
        } catch {
          skipped.push(label);
        }
        setProgress({ done: i + 1, total: items.length });
      }
      setProgress(null);
      await load();
      return { ok, skipped };
    },
    [tripId, userId, activityId, load],
  );

  const remove = useCallback(
    async (mediaId: string, path: string | null): Promise<boolean> => {
      setError(null);
      if (path) await supabase.storage.from("trip-media").remove([path]);
      const { error } = await supabase
        .from("activity_media")
        .delete()
        .eq("id", mediaId);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [load],
  );

  return { media, loading, error, progress, upload, remove, refresh: load };
}
