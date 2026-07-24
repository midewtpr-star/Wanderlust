import { View } from "react-native";
import { Text } from "@/components/ui/text";

// Centered date pill shown between message groups that fall on different local
// days (timestamps are stored UTC, labelled in local time).
export function DayDivider({ label }: { label: string }) {
  return (
    <View className="my-3 flex-row items-center justify-center">
      <View className="rounded-full bg-secondary px-3 py-1">
        <Text variant="caption" className="text-secondary-foreground">
          {label}
        </Text>
      </View>
    </View>
  );
}
