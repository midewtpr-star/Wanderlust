import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/ui/avatar";
import { ReactionButton } from "@/components/outfits/reaction-button";
import { formatDate } from "@/lib/dates";
import type { OutfitCard as OutfitCardData } from "@/hooks/use-outfits";

// A board card: cover (first item), title, day, owner, hearts. Tap → moodboard.
export function OutfitCard({
  outfit,
  onPress,
  onToggleLove,
}: {
  outfit: OutfitCardData;
  onPress: () => void;
  onToggleLove: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={outfit.title}
      className="overflow-hidden rounded-2xl border border-border bg-card active:opacity-90"
    >
      <View className="aspect-square w-full bg-muted">
        {outfit.cover_url ? (
          <Image
            source={{ uri: outfit.cover_url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-3xl">👗</Text>
          </View>
        )}
      </View>
      <View className="gap-1 p-3">
        <Text variant="heading" numberOfLines={1}>
          {outfit.title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {outfit.day ? formatDate(outfit.day) : "Any day"} · {outfit.item_count}{" "}
          item{outfit.item_count === 1 ? "" : "s"}
        </Text>
        <View className="mt-1 flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-1.5">
            <Avatar name={outfit.owner_name} uri={outfit.owner_avatar} size={20} />
            <Text variant="caption" numberOfLines={1} className="flex-1">
              {outfit.owner_name ?? "Member"}
            </Text>
          </View>
          <ReactionButton
            loved={outfit.loved_by_me}
            count={outfit.love_count}
            onToggle={onToggleLove}
            size="sm"
          />
        </View>
      </View>
    </Pressable>
  );
}
