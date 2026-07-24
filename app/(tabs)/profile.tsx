import { View, ScrollView, Pressable, Linking, Platform } from "react-native";
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

// Contact address for content reports (Apple UGC requirement). Operator-set at
// build time; a sensible default until then.
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "support@trippl.app";

// Open a hosted policy page. On web, resolve against the current origin; on
// native, use the configured web origin (EXPO_PUBLIC_WEB_URL).
function openPolicy(path: "community" | "privacy") {
  const base =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.origin
      : process.env.EXPO_PUBLIC_WEB_URL ?? "";
  if (base) Linking.openURL(`${base}/${path}`);
}

// A tappable settings row with a divider (44pt target).
function SettingsLink({
  label,
  onPress,
  destructive,
  last,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={`flex-row items-center justify-between py-3 active:opacity-70 ${last ? "" : "border-b border-border"}`}
      style={{ minHeight: 44 }}
    >
      <Text style={destructive ? { color: "#DC2626", fontWeight: "600" } : undefined}>{label}</Text>
      <Text variant="muted" className="text-lg">
        ›
      </Text>
    </Pressable>
  );
}

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

        {/* Legal & safety — reporting + block live on every profile/message; these
            are the published policy links + contact + account controls (UGC). */}
        <View className="gap-2">
          <Text variant="heading">Legal &amp; safety</Text>
          <Card className="gap-0">
            <SettingsLink label="Community guidelines" onPress={() => openPolicy("community")} />
            <SettingsLink label="Privacy policy" onPress={() => openPolicy("privacy")} />
            <SettingsLink
              label="Report a problem or abuse"
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Trippl%20report`)}
            />
            <SettingsLink label="Acknowledgements" onPress={() => router.push("/acknowledgements")} />
            <SettingsLink label="Delete account" destructive onPress={() => router.push("/delete-account")} last />
          </Card>
        </View>

        <Button label="Sign out" variant="outline" onPress={signOut} />

        <View className="items-center gap-2 pt-8">
          <Logo size={30} />
          <Text variant="caption">made with Trippl</Text>
        </View>
      </ScrollView>
    </View>
  );
}
