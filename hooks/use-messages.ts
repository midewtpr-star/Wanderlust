import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ChatMessage } from "@/types";

// Chat history for a trip. Owns the message array (newest-first) and exposes the
// mutators the realtime + send hooks drive. Paginates older messages on demand
// (load-more on scroll-up), so we never fetch the whole history at once.
const PAGE_SIZE = 30;
const COLS =
  "id, trip_id, sender_id, body, attachment_url, attachment_type, created_at";

const isTemp = (id: string) => id.startsWith("temp_");
const sortNewestFirst = (a: ChatMessage, b: ChatMessage) =>
  a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;

export function useMessages(tripId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Mirror of `messages` for reads inside callbacks without re-creating them
  // (keeps the realtime subscription and list callbacks stable).
  const ref = useRef<ChatMessage[]>([]);
  useEffect(() => {
    ref.current = messages;
  }, [messages]);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("messages")
      .select(COLS)
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as ChatMessage[];
    setMessages(rows);
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  // Older page: everything before the oldest real message we hold.
  const loadMore = useCallback(async () => {
    if (!tripId || loadingMoreRef.current || !hasMore) return;
    const real = ref.current.filter((m) => !isTemp(m.id));
    const oldest = real[real.length - 1];
    if (!oldest) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const { data, error: err } = await supabase
      .from("messages")
      .select(COLS)
      .eq("trip_id", tripId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    if (err) return;
    const older = (data ?? []) as ChatMessage[];
    setHasMore(older.length === PAGE_SIZE);
    if (older.length) {
      setMessages((cur) => {
        const seen = new Set(cur.map((m) => m.id));
        return [...cur, ...older.filter((m) => !seen.has(m.id))];
      });
    }
  }, [tripId, hasMore]);

  // A realtime INSERT (or catch-up) — prepend unless we already have it.
  const applyInsert = useCallback((row: ChatMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === row.id) ? prev : [row, ...prev],
    );
  }, []);

  // A realtime DELETE (or optimistic remove) anywhere in the list.
  const applyDelete = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Optimistic send: show the temp row immediately.
  const addOptimistic = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [msg, ...prev]);
  }, []);

  // Reconcile the temp row with the server row. If the realtime echo already
  // added the real row, just drop the temp (avoids a duplicate).
  const resolveOptimistic = useCallback((tempId: string, row: ChatMessage) => {
    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      if (withoutTemp.some((m) => m.id === row.id)) return withoutTemp;
      return [row, ...withoutTemp];
    });
  }, []);

  const markFailed = useCallback((tempId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId ? { ...m, pending: false, failed: true } : m,
      ),
    );
  }, []);

  // Catch up after a realtime reconnect: pull anything newer than our newest
  // real message and merge it in (dedup + keep newest-first).
  const resync = useCallback(async () => {
    if (!tripId) return;
    const newestReal = ref.current.find((m) => !isTemp(m.id));
    if (!newestReal) {
      load();
      return;
    }
    const { data } = await supabase
      .from("messages")
      .select(COLS)
      .eq("trip_id", tripId)
      .gt("created_at", newestReal.created_at)
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = (data ?? []) as ChatMessage[];
    if (!rows.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...rows.filter((r) => !seen.has(r.id)), ...prev];
      merged.sort(sortNewestFirst);
      return merged;
    });
  }, [tripId, load]);

  return {
    messages,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reload: load,
    applyInsert,
    applyDelete,
    addOptimistic,
    resolveOptimistic,
    markFailed,
    resync,
  };
}
