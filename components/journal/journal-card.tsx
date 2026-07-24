import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";

// Trip-detail entry point into the trip journal.
export function JournalCard({
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
      accessibilityLabel="Open the trip journal"
    >
      <Card className="flex-row items-center justify-between active:opacity-90">
        <View className="flex-1 pr-3">
          <Text variant="heading">Journal</Text>
          <Text variant="muted">
            {count > 0
              ? `${count} entr${count === 1 ? "y" : "ies"} · the story of the trip`
              : "Write the story of the trip"}
          </Text>
        </View>
        <Text variant="muted" className="text-xl">
          ›
        </Text>
      </Card>
    </Pressable>
  );
}
