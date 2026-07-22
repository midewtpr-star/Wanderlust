import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { fontFamily } from "@/constants/theme";

// Trip-detail entry point into the group chat, with an accent unread badge.
export function ChatEntry({
  unread,
  onPress,
}: {
  unread: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0 ? `Open group chat, ${unread} unread` : "Open group chat"
      }
    >
      <Card className="flex-row items-center justify-between active:opacity-90">
        <View className="flex-1 pr-3">
          <Text variant="heading">Group chat</Text>
          <Text variant="muted">Message everyone on the trip.</Text>
        </View>
        {unread > 0 ? (
          <View className="min-w-[26px] items-center justify-center rounded-full border border-primary bg-accent-fill px-2 py-0.5">
            <Text
              className="text-xs text-primary-foreground"
              style={{ fontFamily: fontFamily("semibold") }}
            >
              {unread > 99 ? "99+" : unread}
            </Text>
          </View>
        ) : (
          <Text variant="muted" className="text-xl">
            ›
          </Text>
        )}
      </Card>
    </Pressable>
  );
}
