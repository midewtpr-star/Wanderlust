import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TripUnread } from "@/types";

// Unread chat counts across the signed-in user's trips (trip_unread_counts RPC),
// as a { [tripId]: count } map. Drives the chat-entry badges on the trip detail
// and the Trips list. Refetch on focus (and after opening a chat clears it).
export function useUnreadCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("trip_unread_counts");
    if (error) return;
    const map: Record<string, number> = {};
    ((data ?? []) as TripUnread[]).forEach((r) => {
      map[r.trip_id] = Number(r.unread);
    });
    setCounts(map);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { counts, refresh };
}

// Mark a trip's chat as read for the current user (clears its unread badge).
export async function markChatRead(tripId: string): Promise<void> {
  await supabase.rpc("mark_chat_read", { _trip_id: tripId });
}
