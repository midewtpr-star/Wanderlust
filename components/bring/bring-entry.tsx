import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";

// Trip-detail entry point into the shared bring list.
export function BringEntry({
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
      accessibilityLabel="Open the bring list"
    >
      <Card className="flex-row items-center justify-between active:opacity-90">
        <View className="flex-1 pr-3">
          <Text variant="heading">Bring list</Text>
          <Text variant="muted">
            {count > 0
              ? `${count} item${count === 1 ? "" : "s"} · who's bringing what`
              : "What should the group bring?"}
          </Text>
        </View>
        <Text variant="muted" className="text-xl">
          ›
        </Text>
      </Card>
    </Pressable>
  );
}
