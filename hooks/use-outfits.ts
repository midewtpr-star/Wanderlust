import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signedTripMediaUrl } from "@/lib/storage";
import type { Outfit, OutfitInput } from "@/types";

// A board card: an outfit + its owner, cover (first item), counts, and my love.
export type OutfitCard = Outfit & {
  owner_name: string | null;
  owner_avatar: string | null;
  cover_url: string | null; // display URL (signed when the cover is an upload)
  item_count: number;
  love_count: number;
  loved_by_me: boolean;
};

type OutfitRow = Outfit & {
  owner: { display_name: string | null; avatar_url: string | null } | null;
};
type ItemRow = { outfit_id: string; image_url: string | null; provider: string };
type ReactionRow = { outfit_id: string; user_id: string };

// All outfits for a trip (any member reads; you write only your own — RLS). Also
// resolves each card's cover image (signing uploads) and love counts.
export function useOutfits(
  tripId: string | undefined,
  userId: string | undefined,
) {
  const [outfits, setOutfits] = useState<OutfitCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [outRes, itemRes, reactRes] = await Promise.all([
      supabase
        .from("outfits")
        .select("*, owner:profiles(display_name, avatar_url)")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false }),
      supabase
        .from("outfit_items")
        .select("outfit_id, image_url, provider")
        .eq("trip_id", tripId)
        .order("position", { ascending: true }),
      supabase
        .from("outfit_reactions")
        .select("outfit_id, user_id")
        .eq("trip_id", tripId),
    ]);
    if (outRes.error) {
      setError(outRes.error.message);
      setLoading(false);
      return;
    }

    const items = (itemRes.data ?? []) as ItemRow[];
    const reactions = (reactRes.data ?? []) as ReactionRow[];

    const coverByOutfit = new Map<string, ItemRow>();
    const countByOutfit = new Map<string, number>();
    for (const it of items) {
      countByOutfit.set(it.outfit_id, (countByOutfit.get(it.outfit_id) ?? 0) + 1);
      if (!coverByOutfit.has(it.outfit_id)) coverByOutfit.set(it.outfit_id, it); // items are position-ordered
    }
    const loveCount = new Map<string, number>();
    const mine = new Set<string>();
    for (const r of reactions) {
      loveCount.set(r.outfit_id, (loveCount.get(r.outfit_id) ?? 0) + 1);
      if (r.user_id === userId) mine.add(r.outfit_id);
    }

    const rows = (outRes.data ?? []) as unknown as OutfitRow[];
    const cards: OutfitCard[] = await Promise.all(
      rows.map(async (o) => {
        const cover = coverByOutfit.get(o.id) ?? null;
        let cover_url: string | null = null;
        if (cover?.image_url) {
          cover_url =
            cover.provider === "upload"
              ? await signedTripMediaUrl(cover.image_url)
              : cover.image_url;
        }
        return {
          ...o,
          owner_name: o.owner?.display_name ?? null,
          owner_avatar: o.owner?.avatar_url ?? null,
          cover_url,
          item_count: countByOutfit.get(o.id) ?? 0,
          love_count: loveCount.get(o.id) ?? 0,
          loved_by_me: mine.has(o.id),
        };
      }),
    );
    setOutfits(cards);
    setLoading(false);
  }, [tripId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (input: OutfitInput): Promise<Outfit | null> => {
      if (!tripId || !userId || !input.title.trim()) return null;
      const { data, error } = await supabase
        .from("outfits")
        .insert({
          trip_id: tripId,
          owner_id: userId,
          title: input.title.trim(),
          day: input.day ?? null,
          activity_id: input.activity_id ?? null,
          notes: input.notes?.trim() || null,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        setError(error.message);
        return null;
      }
      await load();
      return (data as Outfit) ?? null;
    },
    [tripId, userId, load],
  );

  const remove = useCallback(
    async (outfitId: string): Promise<boolean> => {
      // Best-effort: clean uploaded item files first (row cascade doesn't touch storage).
      const { data: uploads } = await supabase
        .from("outfit_items")
        .select("image_url")
        .eq("outfit_id", outfitId)
        .eq("provider", "upload");
      const paths = (uploads ?? [])
        .map((u) => u.image_url as string)
        .filter(Boolean);
      if (paths.length) await supabase.storage.from("trip-media").remove(paths);
      const { error } = await supabase.from("outfits").delete().eq("id", outfitId);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [load],
  );

  const toggleLove = useCallback(
    async (outfitId: string) => {
      if (!userId || !tripId) return;
      const current = outfits.find((o) => o.id === outfitId);
      const wasLoved = !!current?.loved_by_me;
      setOutfits((prev) =>
        prev.map((o) =>
          o.id === outfitId
            ? {
                ...o,
                loved_by_me: !wasLoved,
                love_count: Math.max(0, o.love_count + (wasLoved ? -1 : 1)),
              }
            : o,
        ),
      );
      const { error } = wasLoved
        ? await supabase
            .from("outfit_reactions")
            .delete()
            .eq("outfit_id", outfitId)
            .eq("user_id", userId)
        : await supabase
            .from("outfit_reactions")
            .insert({ outfit_id: outfitId, trip_id: tripId, user_id: userId });
      if (error) load(); // reconcile on failure
    },
    [userId, tripId, outfits, load],
  );

  return { outfits, loading, error, create, remove, toggleLove, refresh: load };
}

// A single outfit + its owner (the moodboard screen). notFound covers both a
// missing row and an RLS block (non-member → maybeSingle returns null).
export type OutfitDetail = Outfit & {
  owner_name: string | null;
  owner_avatar: string | null;
};

export function useOutfit(outfitId: string | undefined) {
  const [outfit, setOutfit] = useState<OutfitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!outfitId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    const { data, error } = await supabase
      .from("outfits")
      .select("*, owner:profiles(display_name, avatar_url)")
      .eq("id", outfitId)
      .maybeSingle();
    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const o = data as unknown as OutfitRow;
    setOutfit({
      ...o,
      owner_name: o.owner?.display_name ?? null,
      owner_avatar: o.owner?.avatar_url ?? null,
    });
    setLoading(false);
  }, [outfitId]);

  useEffect(() => {
    load();
  }, [load]);

  return { outfit, loading, notFound, refresh: load };
}

// Lightweight outfit count for the trip-detail entry badge.
export function useOutfitCount(tripId: string | undefined) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    const { count: c } = await supabase
      .from("outfits")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId);
    setCount(c ?? 0);
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { count, refresh };
}

// Love count + my-loved state for a single outfit (the moodboard screen).
export function useOutfitReaction(
  outfitId: string | undefined,
  tripId: string | undefined,
  userId: string | undefined,
) {
  const [count, setCount] = useState(0);
  const [loved, setLoved] = useState(false);

  const load = useCallback(async () => {
    if (!outfitId) return;
    const { data } = await supabase
      .from("outfit_reactions")
      .select("user_id")
      .eq("outfit_id", outfitId);
    const rows = (data ?? []) as { user_id: string }[];
    setCount(rows.length);
    setLoved(!!userId && rows.some((r) => r.user_id === userId));
  }, [outfitId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(async () => {
    if (!outfitId || !tripId || !userId) return;
    const wasLoved = loved;
    setLoved(!wasLoved);
    setCount((c) => Math.max(0, c + (wasLoved ? -1 : 1)));
    const { error } = wasLoved
      ? await supabase
          .from("outfit_reactions")
          .delete()
          .eq("outfit_id", outfitId)
          .eq("user_id", userId)
      : await supabase
          .from("outfit_reactions")
          .insert({ outfit_id: outfitId, trip_id: tripId, user_id: userId });
    if (error) load();
  }, [outfitId, tripId, userId, loved, load]);

  return { count, loved, toggle, refresh: load };
}
