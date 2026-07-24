import { useState } from "react";
import { View, ScrollView, Pressable, Platform, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/lib/theme-provider";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";

const REMOVED = [
  "Your profile, @handle, bio and avatar",
  "Your passport and all its stats",
  "Your connections and pending requests",
  "Your journal entries and uploaded photos & videos",
  "Your Nearby opt-ins and any reports you filed",
];
const KEPT = [
  "Money you logged into a shared pool stays counted toward the group’s total — but is no longer linked to you",
  "Trips you host are handed to another member so the group keeps them",
];

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens: t } = useTheme();
  const { signOut } = useAuth();
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reallyDelete() {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("delete-account", {
      body: { confirm: "DELETE" },
    });
    if (error || !(data as { ok?: boolean })?.ok) {
      setBusy(false);
      setError("We couldn’t delete your account just now. Please try again in a moment.");
      return;
    }
    // Account is gone — clear the local session.
    await signOut();
  }

  function confirm() {
    if (!ack) return;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Permanently delete your Trippl account? This cannot be undone.")) {
        reallyDelete();
      }
    } else {
      Alert.alert(
        "Delete your account?",
        "This permanently deletes your account and cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: reallyDelete },
        ],
      );
    }
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Delete account", headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 18 }}>
        <View className="gap-1">
          <Text variant="display-lg">Delete your account</Text>
          <Text variant="muted">This is permanent and can’t be undone.</Text>
        </View>

        <View className="gap-2">
          <Text variant="heading">What’s removed</Text>
          <Card className="gap-1.5">
            {REMOVED.map((r) => (
              <Text key={r} variant="muted">• {r}</Text>
            ))}
          </Card>
        </View>

        <View className="gap-2">
          <Text variant="heading">What stays (so others aren’t affected)</Text>
          <Card className="gap-1.5">
            {KEPT.map((k) => (
              <Text key={k} variant="muted">• {k}</Text>
            ))}
          </Card>
        </View>

        <Pressable
          onPress={() => setAck((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ack }}
          className="flex-row items-center gap-3 active:opacity-80"
          style={{ minHeight: 44 }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: ack ? t.accentBg : t.cardBg,
              borderWidth: t.cardBorder?.width ?? 1,
              borderColor: ack ? t.accent : t.cardBorder?.color ?? t.border,
            }}
          >
            {ack ? <Text style={{ color: t.accentInk, fontWeight: "800" }}>✓</Text> : null}
          </View>
          <Text className="flex-1">I understand this permanently deletes my account.</Text>
        </Pressable>

        {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}

        <View className="gap-2">
          <Button
            label={busy ? "Deleting…" : "Delete my account"}
            variant="destructive"
            disabled={!ack || busy}
            onPress={confirm}
          />
          <Button label="Cancel" variant="ghost" disabled={busy} onPress={() => router.back()} />
        </View>
      </ScrollView>
    </View>
  );
}
