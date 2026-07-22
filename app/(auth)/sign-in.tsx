import { Stack } from "expo-router";
import { View } from "react-native";
import { Screen } from "@/components/screen";
import { LogoSlot } from "@/components/logo-slot";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

// Phone-first sign-in (decisions.md D4) with email fallback.
// PLACEHOLDER ONLY — no auth logic yet (build-plan Phase 1).
export default function SignInScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Sign in" }} />
      <Screen
        title="Sign in to AppName"
        subtitle="Phone-first (D4) with email fallback. Placeholder — no auth wired up yet."
      >
        <LogoSlot className="mb-4" />
        <View className="w-full max-w-sm gap-3">
          <View className="rounded-lg border border-dashed border-border px-4 py-3">
            <Text variant="muted">[ Phone number input ]</Text>
          </View>
          <Button label="Continue" onPress={() => {}} />
          <Text variant="muted" className="text-center">
            or use email instead
          </Text>
        </View>
      </Screen>
    </>
  );
}
