import { useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/lib/theme-provider";
import { useMyProfile } from "@/hooks/use-profile";
import type { ProfileVisibility } from "@/types";

// Segmented public/private control. Private is the safe default; the caption
// spells out exactly what each means so visibility is never a mystery.
function VisibilityToggle({
  value,
  onChange,
}: {
  value: ProfileVisibility;
  onChange: (v: ProfileVisibility) => void;
}) {
  const { tokens: t } = useTheme();
  const opts: { key: ProfileVisibility; label: string }[] = [
    { key: "private", label: "🔒 Private" },
    { key: "public", label: "🌐 Public" },
  ];
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 12,
              borderRadius: t.radius,
              backgroundColor: active ? t.accentBg : t.cardBg,
              borderWidth: t.cardBorder?.width ?? 1,
              borderColor: active ? t.accent : t.cardBorder?.color ?? t.border,
            }}
          >
            <Text style={{ color: active ? t.accentInk : t.text, fontWeight: "700" }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, loading, saving, error, save } = useMyProfile();

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [bio, setBio] = useState("");
  const [visibility, setVisibility] = useState<ProfileVisibility>("private");
  const [hydrated, setHydrated] = useState(false);

  // Seed the form once the profile loads.
  useEffect(() => {
    if (profile && !hydrated) {
      setDisplayName(profile.display_name ?? "");
      setHandle(profile.handle ?? "");
      setHomeCity(profile.home_city ?? "");
      setBio(profile.bio ?? "");
      setVisibility(profile.visibility);
      setHydrated(true);
    }
  }, [profile, hydrated]);

  async function onSave() {
    const ok = await save({
      display_name: displayName,
      handle,
      home_city: homeCity,
      bio,
      visibility,
    });
    if (ok) router.back();
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Edit profile", headerShown: true }} />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 18 }}
        >
          <View className="gap-1.5">
            <Label>Display name</Label>
            <Input value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
          </View>

          <View className="gap-1.5">
            <Label>Handle</Label>
            <Input
              value={handle}
              onChangeText={setHandle}
              placeholder="yourhandle"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text variant="caption">3–20 characters: letters, numbers or _. Used for @mentions and your profile link.</Text>
          </View>

          <View className="gap-1.5">
            <Label>Home city</Label>
            <Input value={homeCity} onChangeText={setHomeCity} placeholder="Where you're based (optional)" />
          </View>

          <View className="gap-1.5">
            <Label>Bio</Label>
            <Input
              value={bio}
              onChangeText={setBio}
              placeholder="A line or two about you (optional)"
              multiline
              numberOfLines={3}
              style={{ height: 88, paddingTop: 10, textAlignVertical: "top" }}
            />
          </View>

          <View className="gap-1.5">
            <Label>Profile visibility</Label>
            <VisibilityToggle value={visibility} onChange={setVisibility} />
            <Card className="mt-1">
              <Text variant="muted">
                {visibility === "public"
                  ? "Anyone on Trippl can find your profile and passport. Your trips stay private to their members — visibility never shares trip content."
                  : "Only your connections and people you share a trip with can see your profile. You won't appear in search."}
              </Text>
            </Card>
          </View>

          {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}

          <Button label={saving ? "Saving…" : "Save"} onPress={onSave} disabled={saving} />
        </ScrollView>
      )}
    </View>
  );
}
