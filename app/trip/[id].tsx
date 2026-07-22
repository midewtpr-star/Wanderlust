import { Stack, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/screen";
import { Text } from "@/components/ui/text";

// Trip detail (placeholder — build-plan Phase 2).
export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: "Trip" }} />
      <Screen
        title="Trip detail"
        subtitle={`Trip id: ${id ?? "unknown"}. Placeholder — build-plan Phase 2.`}
      >
        <Text variant="muted" className="text-center">
          Members, travel proof, money pools, Airbnb pick, and activities will live here.
        </Text>
      </Screen>
    </>
  );
}
