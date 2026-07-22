import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";

// Trip-detail entry point into the outfit planner.
export function OutfitEntry({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open outfit planner"
    >
      <Card className="flex-row items-center justify-between active:opacity-90">
        <View className="flex-1 pr-3">
          <Text variant="heading">Outfit planner</Text>
          <Text variant="muted">
            {count > 0
              ? `${count} look${count === 1 ? "" : "s"} planned`
              : "Plan your fits — Pinterest-powered."}
          </Text>
        </View>
        <Text variant="muted" className="text-xl">
          ›
        </Text>
      </Card>
    </Pressable>
  );
}
