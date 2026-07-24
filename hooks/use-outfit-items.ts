import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  uploadTripMedia,
  signedTripMediaUrl,
  fileSize,
  MAX_MEDIA_BYTES,
  type PickedFile,
} from "@/lib/storage";
import type { OutfitItem, LinkPreview, OutfitProvider } from "@/types";

export type OutfitItemWithUrl = OutfitItem & { display_url: string | null };

// Items (moodboard cards) for one outfit. Any member reads (signed URLs for
// uploads); only the outfit owner may add / reorder / delete (RLS).
export function useOutfitItems(
  outfitId: string | undefined,
  tripId: string | undefined,
  userId: string | undefined,
) {
  const [items, setItems] = useState<OutfitItemWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!outfitId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("outfit_items")
      .select("*")
      .eq("outfit_id", outfitId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as OutfitItem[];
    const withUrls = await Promise.all(
      rows.map(async (it) => ({
        ...it,
        display_url: it.image_url
          ? it.provider === "upload"
            ? await signedTripMediaUrl(it.image_url)
            : it.image_url
          : null,
      })),
    );
    setItems(withUrls);
    setLoading(false);
  }, [outfitId]);

  useEffect(() => {
    load();
  }, [load]);

  const nextPosition = () =>
    items.length ? Math.max(...items.map((i) => i.position)) + 1 : 0;

  // Add an item from a fetched link/pin preview.
  const addLink = useCallback(
    async (preview: LinkPreview): Promise<boolean> => {
      if (!outfitId || !tripId || !userId) return false;
      setBusy(true);
      const provider: OutfitProvider =
        preview.provider === "pinterest" ? "pinterest" : "link";
      const { error } = await supabase.from("outfit_items").insert({
        outfit_id: outfitId,
        trip_id: tripId,
        owner_id: userId,
        source_url: preview.url,
        image_url: preview.image_url,
        title: preview.title,
        provider,
        position: nextPosition(),
      });
      setBusy(false);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [outfitId, tripId, userId, items, load],
  );

  // Add an item from an uploaded image (private trip-media bucket).
  const addUpload = useCallback(
    async (
      file: PickedFile,
      title: string | null,
    ): Promise<{ ok: boolean; reason?: string }> => {
      if (!outfitId || !tripId || !userId) return { ok: false };
      const size = await fileSize(file);
      if (size != null && size > MAX_MEDIA_BYTES) {
        return { ok: false, reason: "That image is too large (max 50 MB)." };
      }
      setBusy(true);
      try {
        const path = await uploadTripMedia(file, tripId, userId);
        const { error } = await supabase.from("outfit_items").insert({
          outfit_id: outfitId,
          trip_id: tripId,
          owner_id: userId,
          source_url: null,
          image_url: path,
          title: title?.trim() || null,
          provider: "upload",
          position: nextPosition(),
        });
        if (error) throw error;
        await load();
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          reason: e instanceof Error ? e.message : "Upload failed.",
        };
      } finally {
        setBusy(false);
      }
    },
    [outfitId, tripId, userId, items, load],
  );

  const remove = useCallback(
    async (item: OutfitItemWithUrl): Promise<boolean> => {
      if (item.provider === "upload" && item.image_url) {
        await supabase.storage.from("trip-media").remove([item.image_url]);
      }
      const { error } = await supabase
        .from("outfit_items")
        .delete()
        .eq("id", item.id);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [load],
  );

  // Move an item one slot left/right in the grid (swaps stored positions).
  const move = useCallback(
    async (itemId: string, dir: "left" | "right") => {
      const idx = items.findIndex((i) => i.id === itemId);
      if (idx < 0) return;
      const swapIdx = dir === "left" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= items.length) return;
      const a = items[idx];
      const b = items[swapIdx];
      const next = [...items];
      next[idx] = b;
      next[swapIdx] = a;
      setItems(next); // optimistic
      await Promise.all([
        supabase.from("outfit_items").update({ position: b.position }).eq("id", a.id),
        supabase.from("outfit_items").update({ position: a.position }).eq("id", b.id),
      ]);
      await load();
    },
    [items, load],
  );

  return { items, loading, error, busy, addLink, addUpload, remove, move, refresh: load };
}
