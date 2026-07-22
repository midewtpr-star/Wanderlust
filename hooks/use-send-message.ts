import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { notifyNewMessage } from "@/lib/push";
import type { ChatMessage } from "@/types";

const COLS =
  "id, trip_id, sender_id, body, attachment_url, attachment_type, created_at";

// Monotonic temp-id source for optimistic rows (distinct from server UUIDs).
let tempSeq = 0;
const nextTempId = () => `temp_${Date.now()}_${tempSeq++}`;

// Sends a chat message with an optimistic insert: the message shows immediately
// (pending), then reconciles with the server row — or flips to failed. The
// caller wires the three callbacks to useMessages so state stays in one place.
export function useSendMessage(
  tripId: string | undefined,
  userId: string | undefined,
  callbacks: {
    onOptimistic: (msg: ChatMessage) => void;
    onConfirm: (tempId: string, row: ChatMessage) => void;
    onFail: (tempId: string) => void;
  },
) {
  const [sending, setSending] = useState(false);
  const cb = useRef(callbacks);
  useEffect(() => {
    cb.current = callbacks;
  });

  const send = useCallback(
    async (raw: string) => {
      const body = raw.trim();
      if (!body || !tripId || !userId) return;

      const tempId = nextTempId();
      const optimistic: ChatMessage = {
        id: tempId,
        trip_id: tripId,
        sender_id: userId,
        body,
        attachment_url: null,
        attachment_type: null,
        created_at: new Date().toISOString(),
        pending: true,
      };
      cb.current.onOptimistic(optimistic);

      setSending(true);
      const { data, error } = await supabase
        .from("messages")
        .insert({ trip_id: tripId, sender_id: userId, body })
        .select(COLS)
        .single();
      setSending(false);

      if (error || !data) {
        cb.current.onFail(tempId);
        return;
      }
      const row = data as ChatMessage;
      cb.current.onConfirm(tempId, row);

      // Fan the message out to other members' devices. Fire-and-forget: push is
      // best-effort and must never block or fail the send (see lib/push.ts).
      notifyNewMessage(tripId, row.id);
    },
    [tripId, userId],
  );

  return { send, sending };
}
