import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { haversineMiles, formatMiles } from "@/lib/geo";
import type { Idea } from "@/types";

// One local idea. Shows image, rating, distance from the destination, an
// open/directions link, and "Add to activities" (prefills a new activity).
export function IdeaCard({
  idea,
  originLat,
  originLng,
  onUse,
}: {
  idea: Idea;
  originLat: number | null;
  originLng: number | null;
  onUse: () => void;
}) {
  const distance =
    idea.lat != null && idea.lng != null && originLat != null && originLng != null
      ? formatMiles(haversineMiles(originLat, originLng, idea.lat, idea.lng))
      : null;

  return (
    <Card className="w-64 gap-2">
      {idea.image ? (
        <Image
          source={{ uri: idea.image }}
          style={{ width: "100%", height: 120, borderRadius: 8 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-[120px] w-full items-center justify-center rounded-lg bg-muted">
          <Text variant="muted" className="text-xs">
            No photo
          </Text>
        </View>
      )}
      <Text className="font-semibold" numberOfLines={1}>
        {idea.name}
      </Text>
      <View className="flex-row items-center gap-2">
        {idea.rating != null ? (
          <Text variant="muted" className="text-xs">
            ★ {idea.rating.toFixed(1)}
          </Text>
        ) : null}
        {distance ? (
          <Text variant="muted" className="text-xs">
            · {distance}
          </Text>
        ) : null}
        {idea.description ? (
          <Text variant="muted" className="text-xs capitalize" numberOfLines={1}>
            · {idea.description}
          </Text>
        ) : null}
      </View>
      <View className="gap-1">
        <Button label="Add to activities" size="sm" onPress={onUse} />
        {idea.url ? (
          <Pressable onPress={() => WebBrowser.openBrowserAsync(idea.url!)}>
            <Text className="text-center text-xs text-primary">Open / directions ↗</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}
