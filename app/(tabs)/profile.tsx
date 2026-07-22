import { View } from "react-native";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-provider";

// Profile — shows the signed-in identity and a working sign-out (build-plan Phase 1).
export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const label = user?.email ?? user?.phone ?? "Signed in";
  return (
    <Screen title="Profile" subtitle="Your profile and settings. Placeholder.">
      <View className="w-full max-w-sm items-center gap-4">
        <Text variant="muted">{label}</Text>
        <View className="w-full">
          <Button label="Sign out" variant="outline" onPress={signOut} />
        </View>
      </View>
    </Screen>
  );
}
