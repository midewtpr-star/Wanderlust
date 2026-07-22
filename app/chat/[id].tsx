import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  View,
  FlatList,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SendButton } from "@/components/chat/send-button";
import { MessageRow, type ChatRow } from "@/components/chat/message-row";
import { useAuth } from "@/lib/auth-provider";
import { useTheme } from "@/lib/theme-provider";
import { supabase } from "@/lib/supabase";
import { registerPushTokenAsync } from "@/lib/push";
import { useTrip } from "@/hooks/use-trip";
import { useTripMembers } from "@/hooks/use-trip-members";
import { useMessages } from "@/hooks/use-messages";
import { useSendMessage } from "@/hooks/use-send-message";
import { useChatRealtime } from "@/hooks/use-chat-realtime";
import { markChatRead } from "@/hooks/use-unread";
import { formatTime, formatDayLabel, localDayKey } from "@/lib/dates";
import { fontFamily, NEUTRALS } from "@/constants/theme";
import type { ChatMessage } from "@/types";

// Messages this close together from the same sender collapse into one group.
const GROUP_GAP_MS = 5 * 60 * 1000;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { scheme } = useTheme();
  const userId = user?.id;

  const { trip, loading: tripLoading, notAuthorized } = useTrip(id);
  const members = useTripMembers(id);
  const {
    messages,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reload,
    applyInsert,
    applyDelete,
    addOptimistic,
    resolveOptimistic,
    markFailed,
    resync,
  } = useMessages(id);

  useChatRealtime(id, {
    onInsert: applyInsert,
    onDelete: applyDelete,
    onResync: resync,
  });

  const sendCallbacks = useMemo(
    () => ({
      onOptimistic: addOptimistic,
      onConfirm: resolveOptimistic,
      onFail: markFailed,
    }),
    [addOptimistic, resolveOptimistic, markFailed],
  );
  const { send, sending } = useSendMessage(id, userId, sendCallbacks);

  const [text, setText] = useState("");

  // Register for push once the user opens a chat (no-ops until EAS is set up).
  useEffect(() => {
    registerPushTokenAsync();
  }, []);

  // Mark the chat read on open and as new messages arrive while it's on screen,
  // so the unread badge clears on the trip detail + Trips list.
  useEffect(() => {
    if (id) markChatRead(id);
  }, [id, messages.length]);

  // sender_id → profile (name + avatar) from the roster (no per-message join).
  const senderFor = useCallback(
    (sid: string) => {
      const m = members.members.find((mm) => mm.user_id === sid);
      return { name: m?.display_name ?? null, avatar: m?.avatar_url ?? null };
    },
    [members.members],
  );

  // Enrich each message (newest-first) with grouping + divider flags. In this
  // array, index i+1 is the chronologically OLDER neighbor, i-1 the newer one.
  const rows: ChatRow[] = useMemo(() => {
    return messages.map((m, i) => {
      const older = messages[i + 1];
      const newer = messages[i - 1];
      const t = new Date(m.created_at).getTime();
      const sameDayOlder = older && localDayKey(older.created_at) === localDayKey(m.created_at);
      const isGroupStart =
        !older ||
        older.sender_id !== m.sender_id ||
        !sameDayOlder ||
        t - new Date(older.created_at).getTime() > GROUP_GAP_MS;
      const isGroupEnd =
        !newer ||
        newer.sender_id !== m.sender_id ||
        localDayKey(newer.created_at) !== localDayKey(m.created_at) ||
        new Date(newer.created_at).getTime() - t > GROUP_GAP_MS;
      return {
        message: m,
        mine: m.sender_id === userId,
        isGroupStart,
        isGroupEnd,
        showDayDivider: !older || !sameDayOlder,
        dayLabel: formatDayLabel(m.created_at),
        timeLabel: formatTime(m.created_at),
      };
    });
  }, [messages, userId]);

  const confirmDelete = useCallback(
    (m: ChatMessage) => {
      const doDelete = async () => {
        applyDelete(m.id); // optimistic
        // Temp (never-sent) rows just vanish locally; real rows delete for all.
        if (!m.id.startsWith("temp_")) {
          const { error: delErr } = await supabase
            .from("messages")
            .delete()
            .eq("id", m.id);
          if (delErr) applyInsert(m); // restore on failure
        }
      };
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.confirm("Delete this message?")) {
          doDelete();
        }
      } else {
        Alert.alert("Delete message", "Delete this message for everyone?", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]);
      }
    },
    [applyDelete, applyInsert],
  );

  const onSend = useCallback(() => {
    if (!text.trim() || !userId) return;
    send(text);
    setText("");
  }, [text, userId, send]);

  // Web: Enter sends, Shift+Enter inserts a newline. Mobile uses the send button.
  const onKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (Platform.OS !== "web") return;
      const ne = e.nativeEvent as TextInputKeyPressEventData & {
        shiftKey?: boolean;
        preventDefault?: () => void;
      };
      if (ne.key === "Enter" && !ne.shiftKey) {
        ne.preventDefault?.();
        onSend();
      }
    },
    [onSend],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatRow }) => (
      <MessageRow
        row={item}
        sender={senderFor(item.message.sender_id)}
        onDeleteOwn={confirmDelete}
      />
    ),
    [senderFor, confirmDelete],
  );

  const canSend = text.trim().length > 0 && !!userId;
  const headerTitle = trip?.title ? `${trip.title} · Chat` : "Chat";

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
      >
        {tripLoading || loading ? (
          <ChatSkeleton />
        ) : notAuthorized ? (
          <Centered>
            <Text variant="heading">Not available</Text>
            <Text variant="muted" className="text-center">
              This trip doesn&apos;t exist or you&apos;re not a member.
            </Text>
            <Button
              label="Back to Trips"
              variant="outline"
              onPress={() => router.replace("/")}
            />
          </Centered>
        ) : error && rows.length === 0 ? (
          <Centered>
            <Text className="text-destructive">Couldn&apos;t load messages.</Text>
            <Text variant="muted" className="text-center">
              {error}
            </Text>
            <Button label="Try again" variant="outline" onPress={reload} />
          </Centered>
        ) : rows.length === 0 ? (
          <Centered>
            <Text variant="heading">Say hi to the group 👋</Text>
            <Text variant="muted" className="text-center">
              This is the start of your trip chat. Drop the first message.
            </Text>
          </Centered>
        ) : (
          <FlatList
            data={rows}
            inverted
            keyExtractor={(r) => r.message.id}
            renderItem={renderItem}
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View className="py-3">
                  <ActivityIndicator />
                </View>
              ) : null
            }
            contentContainerStyle={{ paddingVertical: 12 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            removeClippedSubviews={Platform.OS !== "web"}
            initialNumToRender={20}
            windowSize={11}
          />
        )}

        {/* Composer — pinned to the bottom, above the keyboard. */}
        {!notAuthorized ? (
          <View
            className="border-t border-border bg-background px-3 pt-2"
            style={{ paddingBottom: insets.bottom + 8 }}
          >
            <View className="flex-row items-end gap-2">
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Message the group…"
                placeholderTextColor={NEUTRALS[scheme].textSecondary}
                multiline
                className="max-h-[120px] min-h-[44px] flex-1 rounded-2xl border border-border bg-secondary px-3.5 py-2.5 text-[15px] text-foreground"
                style={{ fontFamily: fontFamily("regular") }}
                onKeyPress={onKeyPress}
                submitBehavior="newline"
                editable={!!userId}
                accessibilityLabel="Message the group"
              />
              <SendButton onPress={onSend} disabled={!canSend || sending} />
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-8">{children}</View>
  );
}

// A few placeholder bubbles while history loads.
function ChatSkeleton() {
  const rows = [
    { mine: false, w: 180 },
    { mine: true, w: 120 },
    { mine: false, w: 220 },
    { mine: false, w: 90 },
    { mine: true, w: 160 },
  ];
  return (
    <View className="flex-1 justify-end gap-3 p-4">
      {rows.map((r, i) => (
        <View
          key={i}
          className={r.mine ? "items-end" : "items-start"}
        >
          <Skeleton width={r.w} height={38} radius={18} />
        </View>
      ))}
    </View>
  );
}
