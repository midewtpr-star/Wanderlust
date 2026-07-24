import type { ReactNode } from "react";
import { View, Pressable } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";

// A calm list row for a person: avatar + name/@handle + an optional trailing
// slot (buttons, a chevron). Used in the connections list, requests and search.
// Whole row is tappable to open their profile when onPress is given.
export function PersonRow({
  name,
  handle,
  avatarUrl,
  subtitle,
  onPress,
  right,
}: {
  name: string | null;
  handle: string | null;
  avatarUrl?: string | null;
  subtitle?: string | null;
  onPress?: () => void;
  right?: ReactNode;
}) {
  const body = (
    <View className="flex-row items-center gap-3" style={{ minHeight: 48, paddingVertical: 6 }}>
      <Avatar name={name} uri={avatarUrl} size={44} />
      <View className="flex-1">
        <Text variant="heading" numberOfLines={1}>
          {name ?? "Traveler"}
        </Text>
        {handle ? (
          <Text variant="muted" numberOfLines={1}>
            @{handle}
          </Text>
        ) : subtitle ? (
          <Text variant="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" className="active:opacity-80">
        {body}
      </Pressable>
    );
  }
  return body;
}
