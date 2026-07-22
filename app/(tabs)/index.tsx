import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/screen";
import { LogoSlot } from "@/components/logo-slot";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-provider";

// Trips list (placeholder — build-plan Phase 2).
export default function TripsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const who = user?.email ?? user?.phone ?? null;
  return (
    <Screen
      title="Trips"
      subtitle="Your trips will show up here. Placeholder — build-plan Phase 2."
    >
      <LogoSlot className="mb-2" />
      {who ? <Text variant="muted">Signed in as {who}</Text> : null}
      <View className="w-full max-w-sm gap-3">
        <Button
          label="Open a sample trip"
          onPress={() => router.push("/trip/demo")}
        />
        <Button
          label="Create a trip"
          variant="secondary"
          onPress={() => router.push("/create")}
        />
      </View>
      <Text variant="muted">AppName · scaffold</Text>
    </Screen>
  );
}
