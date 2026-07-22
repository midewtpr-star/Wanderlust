import { memo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/ui/avatar";
import { DayDivider } from "@/components/chat/day-divider";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";
import type { ChatMessage } from "@/types";

// One rendered chat row: an optional day divider above the bubble, then the
// bubble itself. Grouping flags (computed in the screen) drive whether the
// sender's name/avatar and the timestamp show, so consecutive messages from the
// same sender stack tightly.
export type ChatRow = {
  message: ChatMessage;
  mine: boolean;
  isGroupStart: boolean; // first (oldest) of a same-sender run
  isGroupEnd: boolean; // last (newest) of a same-sender run
  showDayDivider: boolean; // first message of a local day
  dayLabel: string;
  timeLabel: string;
};

export type Sender = { name: string | null; avatar: string | null };

function MessageRowBase({
  row,
  sender,
  onDeleteOwn,
}: {
  row: ChatRow;
  sender: Sender;
  onDeleteOwn: (m: ChatMessage) => void;
}) {
  const {
    message,
    mine,
    isGroupStart,
    isGroupEnd,
    showDayDivider,
    dayLabel,
    timeLabel,
  } = row;

  return (
    <View>
      {showDayDivider ? <DayDivider label={dayLabel} /> : null}
      <View
        className={cn(
          "flex-row px-4",
          mine ? "justify-end" : "justify-start",
          isGroupEnd ? "mb-2" : "mb-0.5",
        )}
      >
        {/* Others: reserve the avatar gutter; show the avatar on the last bubble
            of the group so a run of messages lines up under one avatar. */}
        {!mine ? (
          <View className="mr-2 w-8 justify-end">
            {isGroupEnd ? (
              <Avatar name={sender.name} uri={sender.avatar} size={32} />
            ) : null}
          </View>
        ) : null}

        <View className={cn("max-w-[80%]", mine ? "items-end" : "items-start")}>
          {!mine && isGroupStart ? (
            <Text variant="caption" numberOfLines={1} className="mb-0.5 ml-1">
              {sender.name ?? "Member"}
            </Text>
          ) : null}

          <Pressable
            onLongPress={mine ? () => onDeleteOwn(message) : undefined}
            delayLongPress={350}
            disabled={!mine}
            accessibilityRole={mine ? "button" : "text"}
            className={cn(
              "rounded-2xl px-3.5 py-2",
              // Mine = accent fill (never invisible via border-primary); others =
              // neutral surface. See docs/design.md.
              mine ? "border border-primary bg-accent-fill" : "bg-secondary",
              mine
                ? isGroupEnd
                  ? "rounded-br-md"
                  : ""
                : isGroupEnd
                  ? "rounded-bl-md"
                  : "",
              message.pending ? "opacity-70" : "",
              message.failed ? "opacity-60" : "",
            )}
          >
            <Text
              className={cn(
                "text-[15px] leading-5",
                mine ? "text-primary-foreground" : "text-foreground",
              )}
              style={{ fontFamily: fontFamily("regular") }}
            >
              {message.body}
            </Text>
          </Pressable>

          {isGroupEnd || message.failed || message.pending ? (
            <Text
              variant="caption"
              className={cn("mt-0.5", mine ? "mr-1 text-right" : "ml-1")}
            >
              {message.failed
                ? "Failed to send · long-press to remove"
                : message.pending
                  ? "Sending…"
                  : timeLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const MessageRow = memo(MessageRowBase);
