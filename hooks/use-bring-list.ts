import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BringItem, BringItemInput, BringPriority } from "@/types";

// One claimer of an item (a member who said "I'll bring it").
export type Claimer = {
  user_id: string;
  name: string | null;
  avatar: string | null;
  quantity: number | null;
};

// An item composed with its claimers + convenience flags for the UI.
export type BringItemView = BringItem & {
  claims: Claimer[];
  claimed: boolean;
  claimedByMe: boolean;
};

export type BringSummary = {
  total: number;
  claimed: number;
  unclaimed: number;
  neededTotal: number;
  neededRemaining: number; // needed-priority items still unclaimed
};

type ClaimRow = {
  item_id: string;
  user_id: string;
  quantity: number | null;
  claimer: { display_name: string | null; avatar_url: string | null } | null;
};

// The shared bring list for a trip: items + who's bringing each, plus a progress
// summary. Any member reads all; write rules are enforced by RLS. Exposes
// optimistic helpers so claim/unclaim reflect instantly (see useClaimItem).
export function useBringList(
  tripId: string | undefined,
  userId: string | undefined,
) {
  const [items, setItems] = useState<BringItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [itemRes, claimRes] = await Promise.all([
      supabase
        .from("bring_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true }),
      supabase
        .from("bring_claims")
        .select("item_id, user_id, quantity, claimer:profiles(display_name, avatar_url)")
        .eq("trip_id", tripId),
    ]);
    if (itemRes.error) {
      setError(itemRes.error.message);
      setLoading(false);
      return;
    }
    const claimsByItem = new Map<string, Claimer[]>();
    ((claimRes.data ?? []) as unknown as ClaimRow[]).forEach((c) => {
      const arr = claimsByItem.get(c.item_id) ?? [];
      arr.push({
        user_id: c.user_id,
        name: c.claimer?.display_name ?? null,
        avatar: c.claimer?.avatar_url ?? null,
        quantity: c.quantity,
      });
      claimsByItem.set(c.item_id, arr);
    });

    const rows = (itemRes.data ?? []) as BringItem[];
    setItems(
      rows.map((it) => {
        const claims = claimsByItem.get(it.id) ?? [];
        return {
          ...it,
          claims,
          claimed: claims.length > 0,
          claimedByMe: !!userId && claims.some((c) => c.user_id === userId),
        };
      }),
    );
    setLoading(false);
  }, [tripId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Optimistic: add my claim to an item immediately.
  const applyClaimLocal = useCallback((itemId: string, me: Claimer) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId && !it.claims.some((c) => c.user_id === me.user_id)
          ? {
              ...it,
              claims: [...it.claims, me],
              claimed: true,
              claimedByMe: true,
            }
          : it,
      ),
    );
  }, []);

  // Optimistic: remove my claim from an item immediately.
  const applyUnclaimLocal = useCallback((itemId: string, uid: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const claims = it.claims.filter((c) => c.user_id !== uid);
        return {
          ...it,
          claims,
          claimed: claims.length > 0,
          claimedByMe: uid === userId ? false : it.claimedByMe,
        };
      }),
    );
  }, [userId]);

  const summary: BringSummary = useMemo(() => {
    const total = items.length;
    const claimed = items.filter((i) => i.claimed).length;
    const needed = items.filter((i) => i.priority === "needed");
    return {
      total,
      claimed,
      unclaimed: total - claimed,
      neededTotal: needed.length,
      neededRemaining: needed.filter((i) => !i.claimed).length,
    };
  }, [items]);

  return {
    items,
    summary,
    loading,
    error,
    refresh: load,
    applyClaimLocal,
    applyUnclaimLocal,
  };
}

// Item CRUD. Add is open to any member; edit/delete are gated to creator/admin
// by RLS (the UI only shows those affordances to the creator/admin).
export function useAddBringItem(
  tripId: string | undefined,
  userId: string | undefined,
) {
  const [saving, setSaving] = useState(false);

  const addItem = useCallback(
    async (input: BringItemInput): Promise<BringItem | null> => {
      if (!tripId || !userId || !input.name.trim()) return null;
      setSaving(true);
      const { data, error } = await supabase
        .from("bring_items")
        .insert({
          trip_id: tripId,
          created_by: userId,
          name: input.name.trim(),
          category: input.category?.trim() || null,
          priority: (input.priority ?? "optional") as BringPriority,
          quantity: input.quantity ?? null,
          notes: input.notes?.trim() || null,
        })
        .select("*")
        .maybeSingle();
      setSaving(false);
      if (error) return null;
      return (data as BringItem) ?? null;
    },
    [tripId, userId],
  );

  const updateItem = useCallback(
    async (id: string, patch: BringItemInput): Promise<boolean> => {
      setSaving(true);
      const { error } = await supabase
        .from("bring_items")
        .update({
          name: patch.name.trim(),
          category: patch.category?.trim() || null,
          priority: (patch.priority ?? "optional") as BringPriority,
          quantity: patch.quantity ?? null,
          notes: patch.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      setSaving(false);
      return !error;
    },
    [],
  );

  const removeItem = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("bring_items").delete().eq("id", id);
    return !error;
  }, []);

  return { addItem, updateItem, removeItem, saving };
}

// Claim / unclaim an item for the current user only (RLS). A re-claim upserts
// (updates the optional quantity) rather than erroring on the unique constraint.
export function useClaimItem(
  tripId: string | undefined,
  userId: string | undefined,
) {
  const [busy, setBusy] = useState(false);

  const claim = useCallback(
    async (itemId: string, quantity: number | null = null): Promise<boolean> => {
      if (!tripId || !userId) return false;
      setBusy(true);
      const { error } = await supabase.from("bring_claims").upsert(
        { item_id: itemId, trip_id: tripId, user_id: userId, quantity },
        { onConflict: "item_id,user_id" },
      );
      setBusy(false);
      return !error;
    },
    [tripId, userId],
  );

  const unclaim = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!userId) return false;
      setBusy(true);
      const { error } = await supabase
        .from("bring_claims")
        .delete()
        .eq("item_id", itemId)
        .eq("user_id", userId);
      setBusy(false);
      return !error;
    },
    [userId],
  );

  return { claim, unclaim, busy };
}

// Lightweight item count for the trip-detail entry badge.
export function useBringCount(tripId: string | undefined) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    const { count: c } = await supabase
      .from("bring_items")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId);
    setCount(c ?? 0);
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { count, refresh };
}
