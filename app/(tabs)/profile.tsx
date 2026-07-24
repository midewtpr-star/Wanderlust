import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppearanceSettings } from "@/components/settings/appearance";
import { SkinPicker } from "@/components/settings/skin-picker";
import { Logo } from "@/components/logo-slot";
import { useAuth } from "@/lib/auth-provider";
import { useMyProfile } from "@/hooks/use-profile";

// Profile + Settings (Phase 1 identity/sign-out; Phase 10 appearance controls).
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isModerator } = useMyProfile();
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

        <Pressable onPress={() => router.push("/passport")} accessibilityRole="button" accessibilityLabel="Open your travel passport">
          <Card className="flex-row items-center justify-between active:opacity-90">
            <View className="flex-1 pr-3">
              <Text variant="heading">🌐 Your passport</Text>
              <Text variant="muted">Lifetime places, countries, airports, miles</Text>
            </View>
            <Text variant="muted" className="text-xl">
              ›
            </Text>
          </Card>
        </Pressable>

        <Pressable onPress={() => router.push("/connections")} accessibilityRole="button" accessibilityLabel="Open your connections">
          <Card className="flex-row items-center justify-between active:opacity-90">
            <View className="flex-1 pr-3">
              <Text variant="heading">🤝 Connections</Text>
              <Text variant="muted">Find travelers and manage requests</Text>
            </View>
            <Text variant="muted" className="text-xl">
              ›
            </Text>
          </Card>
        </Pressable>

        <View className="flex-row gap-3">
          <Button
            label="Public profile"
            variant="outline"
            className="flex-1"
            onPress={() => user && router.push(`/profile/${user.id}`)}
          />
          <Button
            label="Edit profile"
            variant="outline"
            className="flex-1"
            onPress={() => router.push("/profile-edit")}
          />
        </View>

        {isModerator ? (
          <Pressable onPress={() => router.push("/moderation")} accessibilityRole="button" accessibilityLabel="Open moderation queue">
            <Card className="flex-row items-center justify-between active:opacity-90">
              <View className="flex-1 pr-3">
                <Text variant="heading">🛡️ Moderation</Text>
                <Text variant="muted">Review reported content and users</Text>
              </View>
              <Text variant="muted" className="text-xl">
                ›
              </Text>
            </Card>
          </Pressable>
        ) : null}

        <SkinPicker />

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
