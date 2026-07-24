import { useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/ui/date-field";
import { useTheme } from "@/lib/theme-provider";
import { useMyProfile } from "@/hooks/use-profile";
import { ageBandFromBirthdate, canBePublic } from "@/lib/safety";
import type { ProfileVisibility } from "@/types";

// Segmented public/private control. Private is the safe default; the caption
// spells out exactly what each means so visibility is never a mystery.
function VisibilityToggle({
  value,
  onChange,
  publicDisabled,
}: {
  value: ProfileVisibility;
  onChange: (v: ProfileVisibility) => void;
  publicDisabled?: boolean;
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
        const disabled = o.key === "public" && publicDisabled;
        return (
          <Pressable
            key={o.key}
            onPress={() => !disabled && onChange(o.key)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 12,
              borderRadius: t.radius,
              opacity: disabled ? 0.45 : 1,
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
  const { profile, ageBand, loading, saving, error, save, setAge } = useMyProfile();

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [bio, setBio] = useState("");
  const [visibility, setVisibility] = useState<ProfileVisibility>("private");
  const [dob, setDob] = useState<Date | null>(null);
  const [ageMsg, setAgeMsg] = useState<string | null>(null);
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

  // Only a verified adult can be public. Unset age → must confirm first.
  const publicAllowed = canBePublic(ageBand);

  // Confirm age from a DOB (server stores the band only). A minor gets forced
  // private, so reflect that in the toggle immediately.
  async function confirmAge() {
    if (!dob) return;
    const iso = dob.toISOString().slice(0, 10);
    const preview = ageBandFromBirthdate(iso);
    if (!preview) {
      setAgeMsg("That date doesn't look right.");
      return;
    }
    const band = await setAge(iso);
    if (band === "minor") {
      setVisibility("private");
      setAgeMsg("Thanks. Under-18 profiles stay private.");
    } else if (band === "adult") {
      setAgeMsg("Age confirmed — you can go public now.");
    }
  }

  async function onSave() {
    // Never persist a public visibility the age gate doesn't allow.
    const safeVisibility: ProfileVisibility = publicAllowed ? visibility : "private";
    const ok = await save({
      display_name: displayName,
      handle,
      home_city: homeCity,
      bio,
      visibility: safeVisibility,
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

          {/* Age gate — a verified adult can go public; under-18 stays private */}
          <View className="gap-1.5">
            <Label>Age</Label>
            {ageBand ? (
              <Card>
                <Text variant="muted">
                  {ageBand === "adult"
                    ? "✓ Age confirmed — you can make your profile public."
                    : "Under 18 — your profile stays private and off discovery. That keeps you safer."}
                </Text>
              </Card>
            ) : (
              <View className="gap-2">
                <DateField value={dob} onChange={setDob} placeholder="Your date of birth" />
                <Text variant="caption">
                  Confirm your age to make your profile public. We store only whether you are over 18 — never the date.
                </Text>
                <Button label="Confirm age" variant="outline" disabled={!dob} onPress={confirmAge} />
              </View>
            )}
            {ageMsg ? <Text variant="muted">{ageMsg}</Text> : null}
          </View>

          <View className="gap-1.5">
            <Label>Profile visibility</Label>
            <VisibilityToggle value={visibility} onChange={setVisibility} publicDisabled={!publicAllowed} />
            <Card className="mt-1">
              <Text variant="muted">
                {!publicAllowed
                  ? "Confirm you are over 18 above to make your profile public. Until then it stays private."
                  : visibility === "public"
                    ? "Anyone on Trippl can find your profile and passport. Your trips stay private to their members — visibility never shares trip content."
                    : "Only your connections and people you share a trip with can see your profile. You will not appear in search."}
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
