import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  uploadTripMedia,
  signedTripMediaUrl,
  fileSize,
  MAX_MEDIA_BYTES,
  type PickedFile,
} from "@/lib/storage";
import type {
  JournalEntry,
  JournalEntryInput,
  JournalEntryView,
  JournalMedia,
  JournalMediaType,
  JournalMediaWithUrl,
} from "@/types";

// A photo/video staged for upload (from the composer). kind is decided at pick time.
export type JournalUpload = { file: PickedFile; kind: JournalMediaType };
export type UploadProgress = { done: number; total: number } | null;

// The nested-select shape Supabase returns for an entry + author + media.
type EntryRow = JournalEntry & {
  author: { display_name: string | null; avatar_url: string | null } | null;
  media: JournalMedia[] | null;
};

const ENTRY_SELECT =
  "*, author:profiles!author_id(display_name, avatar_url), media:journal_media(*)";

// Resolve a row (entry + author + media) into a view, signing each media URL.
async function toView(row: EntryRow): Promise<JournalEntryView> {
  const media = (row.media ?? []).slice().sort((a, b) => a.position - b.position);
  const withUrls: JournalMediaWithUrl[] = await Promise.all(
    media.map(async (m) => ({
      ...m,
      signedUrl: m.url ? await signedTripMediaUrl(m.url) : null,
    })),
  );
  return {
    id: row.id,
    trip_id: row.trip_id,
    author_id: row.author_id,
    body: row.body,
    day: row.day,
    activity_id: row.activity_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author_name: row.author?.display_name ?? null,
    author_avatar: row.author?.avatar_url ?? null,
    media: withUrls,
  };
}

// Upload staged media for an entry (guardrail + progress), appending after
// `startPos`. Returns how many succeeded + a list of skipped labels.
async function uploadMediaFor(
  entryId: string,
  tripId: string,
  userId: string,
  uploads: JournalUpload[],
  startPos: number,
  onProgress: (p: UploadProgress) => void,
): Promise<{ ok: number; skipped: string[] }> {
  const skipped: string[] = [];
  let ok = 0;
  onProgress({ done: 0, total: uploads.length });
  for (let i = 0; i < uploads.length; i++) {
    const { file, kind } = uploads[i];
    const label = file.name ?? (kind === "video" ? "a video" : "a photo");
    const size = await fileSize(file);
    if (size != null && size > MAX_MEDIA_BYTES) {
      skipped.push(`${label} (too large — max 50 MB)`);
      onProgress({ done: i + 1, total: uploads.length });
      continue;
    }
    try {
      const path = await uploadTripMedia(file, tripId, userId);
      const { error } = await supabase.from("journal_media").insert({
        entry_id: entryId,
        trip_id: tripId,
        uploaded_by: userId,
        media_type: kind,
        url: path,
        position: startPos + i,
      });
      if (error) throw error;
      ok++;
    } catch {
      skipped.push(label);
    }
    onProgress({ done: i + 1, total: uploads.length });
  }
  onProgress(null);
  return { ok, skipped };
}

// The trip's journal timeline: all entries (newest first) with author + media,
// plus creating a new entry (text + multi photo/video in one composition). Any
// member reads; only the author writes their own (RLS).
export function useJournal(tripId: string | undefined, userId: string | undefined) {
  const [entries, setEntries] = useState<JournalEntryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress>(null);

  const load = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("journal_entries")
      .select(ENTRY_SELECT)
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const views = await Promise.all(((data ?? []) as EntryRow[]).map(toView));
    setEntries(views);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  // Create an entry, then upload its media. Requires text OR at least one media.
  // Returns the new entry id (+ any skipped uploads), or null on failure.
  const create = useCallback(
    async (
      input: JournalEntryInput,
      uploads: JournalUpload[],
    ): Promise<{ id: string; skipped: string[] } | null> => {
      if (!tripId || !userId) return null;
      const body = input.body.trim();
      if (!body && uploads.length === 0) {
        setError("Add some words or a photo/video first.");
        return null;
      }
      setError(null);
      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          trip_id: tripId,
          author_id: userId,
          body,
          day: input.day ?? null,
          activity_id: input.activity_id ?? null,
        })
        .select("id")
        .maybeSingle();
      if (error || !data) {
        setError(error?.message ?? "Couldn't save the entry.");
        return null;
      }
      const id = (data as { id: string }).id;
      let skipped: string[] = [];
      if (uploads.length) {
        const res = await uploadMediaFor(id, tripId, userId, uploads, 0, setProgress);
        skipped = res.skipped;
      }
      await load();
      return { id, skipped };
    },
    [tripId, userId, load],
  );

  return { entries, loading, error, progress, create, refresh: load };
}

// A single entry for the detail screen, with the author's own edit/delete +
// add/remove media. The route only carries an entryId; trip_id is read off the
// loaded entry (needed for the media upload path). Returns notFound when the
// entry is missing or not visible.
export function useJournalEntry(
  entryId: string | undefined,
  userId: string | undefined,
) {
  const [entry, setEntry] = useState<JournalEntryView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress>(null);

  const load = useCallback(async () => {
    if (!entryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("journal_entries")
      .select(ENTRY_SELECT)
      .eq("id", entryId)
      .maybeSingle();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (!data) {
      setNotFound(true);
      setEntry(null);
      setLoading(false);
      return;
    }
    setEntry(await toView(data as EntryRow));
    setLoading(false);
  }, [entryId]);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (patch: JournalEntryInput): Promise<boolean> => {
      if (!entryId) return false;
      const body = patch.body.trim();
      const mediaCount = entry?.media.length ?? 0;
      if (!body && mediaCount === 0) {
        setError("An entry needs text or at least one photo/video.");
        return false;
      }
      setError(null);
      const { error } = await supabase
        .from("journal_entries")
        .update({
          body,
          day: patch.day ?? null,
          activity_id: patch.activity_id ?? null,
        })
        .eq("id", entryId);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [entryId, entry?.media.length, load],
  );

  const addMedia = useCallback(
    async (uploads: JournalUpload[]): Promise<string[]> => {
      const tripId = entry?.trip_id;
      if (!entryId || !tripId || !userId || uploads.length === 0) return [];
      const startPos =
        (entry?.media.reduce((max, m) => Math.max(max, m.position), -1) ?? -1) + 1;
      const { skipped } = await uploadMediaFor(
        entryId,
        tripId,
        userId,
        uploads,
        startPos,
        setProgress,
      );
      await load();
      return skipped;
    },
    [entryId, userId, entry?.trip_id, entry?.media, load],
  );

  const removeMedia = useCallback(
    async (mediaId: string, path: string | null): Promise<boolean> => {
      setError(null);
      if (path) await supabase.storage.from("trip-media").remove([path]);
      const { error } = await supabase.from("journal_media").delete().eq("id", mediaId);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [load],
  );

  // Delete the entry. Its media rows cascade; also purge the files from storage.
  const remove = useCallback(async (): Promise<boolean> => {
    if (!entryId) return false;
    setError(null);
    const paths = (entry?.media ?? [])
      .map((m) => m.url)
      .filter((u): u is string => !!u);
    if (paths.length) await supabase.storage.from("trip-media").remove(paths);
    const { error } = await supabase.from("journal_entries").delete().eq("id", entryId);
    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }, [entryId, entry?.media]);

  return {
    entry,
    loading,
    notFound,
    error,
    progress,
    update,
    addMedia,
    removeMedia,
    remove,
    refresh: load,
  };
}

// Lightweight entry count for the trip-detail journal badge.
export function useJournalCount(tripId: string | undefined) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    const { count: c } = await supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId);
    setCount(c ?? 0);
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { count, refresh };
}
