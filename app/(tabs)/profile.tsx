import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { AppearanceSettings } from "@/components/settings/appearance";
import { Logo } from "@/components/logo-slot";
import { useAuth } from "@/lib/auth-provider";

// Profile + Settings (Phase 1 identity/sign-out; Phase 10 appearance controls).
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const label = user?.email ?? user?.phone ?? "Signed in";

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 40,
          gap: 20,
        }}
      >
        <View className="gap-1">
          <Text variant="display-lg">Settings</Text>
          <Text variant="muted">{label}</Text>
        </View>

        <AppearanceSettings />

        <Button label="Sign out" variant="outline" onPress={signOut} />

        <View className="items-center gap-2 pt-8">
          <Logo size={30} />
          <Text variant="caption">made with Trippl</Text>
        </View>
      </ScrollView>
    </View>
  );
}
