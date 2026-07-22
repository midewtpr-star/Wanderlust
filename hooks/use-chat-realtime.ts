import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { ChatMessage } from "@/types";

// Live message stream for a trip via Supabase Realtime (postgres_changes on the
// messages table, filtered by trip_id). RLS is enforced per-subscriber, so a
// member only receives their own trips' rows. Subscribes once per trip and
// cleans up on unmount; handlers are read through a ref so changing them never
// tears down + rebuilds the channel.
export function useChatRealtime(
  tripId: string | undefined,
  handlers: {
    onInsert: (row: ChatMessage) => void;
    onDelete: (id: string) => void;
    onResync?: () => void; // called on (re)subscribe to catch anything missed
  },
) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    if (!tripId) return;
    let active = true;

    const channel = supabase
      .channel(`messages:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          if (active) ref.current.onInsert(payload.new as ChatMessage);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const old = payload.old as { id?: string };
          if (active && old?.id) ref.current.onDelete(old.id);
        },
      )
      .subscribe((status) => {
        // SUBSCRIBED fires on the first connect AND after the socket recovers
        // from a drop — a good moment to reconcile any messages we missed.
        if (status === "SUBSCRIBED") ref.current.onResync?.();
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [tripId]);
}
