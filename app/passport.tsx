import { useRef, useState } from "react";
import { View, ScrollView, ActivityIndicator, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Boundary } from "@/components/ui/boundary";
import { WorldMap } from "@/components/passport/world-map";
import { useTheme } from "@/lib/theme-provider";
import { usePassport, type PassportStats } from "@/hooks/use-passport";
import { shareImage } from "@/lib/share";

const CAPTURE = {
  format: "png" as const,
  quality: 0.9,
  result: Platform.OS === "web" ? ("data-uri" as const) : ("tmpfile" as const),
};

function startedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function Counter({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  const { tokens: t } = useTheme();
  return (
    <View
      style={{
        width: "31%",
        minWidth: 96,
        flexGrow: 1,
        alignItems: "center",
        paddingVertical: 12,
        borderRadius: t.radius,
        backgroundColor: t.tileBg,
        borderWidth: t.tileBorder?.width ?? 0,
        borderColor: t.tileBorder?.color,
      }}
    >
      <Text style={{ fontFamily: t.numFont, fontVariant: ["tabular-nums"], color: t.text, fontSize: 24, fontWeight: "800" }}>
        {value}
      </Text>
      <Text variant="caption" className="text-center">
        {label}
      </Text>
      {sub ? (
        <Text style={{ color: t.dim, fontSize: 9, textAlign: "center", marginTop: 1 }}>{sub}</Text>
      ) : null}
    </View>
  );
}

export default function PassportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { stats, pins, milesCoverage, loading, empty } = usePassport();
  const cardRef = useRef<View>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    setMsg(null);
    try {
      const { captureRef } = await import("react-native-view-shot");
      const uri = await captureRef(cardRef, CAPTURE);
      const r = await shareImage(uri);
      setMsg(r === "shared" ? "Shared!" : r === "downloaded" ? "Downloaded your passport." : "Screenshot your passport to share.");
    } catch {
      setMsg("Couldn't export your passport.");
    }
    setBusy(false);
  }

  const started = startedLabel(stats.started_on);
  const counters: { label: string; value: number; sub?: string }[] = [
    { label: "Trips", value: stats.trips },
    { label: "Places", value: stats.places },
    { label: "Countries", value: stats.countries },
    { label: "Continents", value: stats.continents },
    { label: "Airports", value: stats.airports },
    { label: "Landmarks", value: stats.landmarks },
    { label: "Miles", value: stats.miles, sub: `${milesCoverage.tracked} of ${milesCoverage.total} tracked` },
    { label: "Days away", value: stats.days },
  ];

  return (
    <Boundary variant="world">
      <Stack.Screen options={{ title: "Passport", headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator />
          </View>
        ) : empty ? (
          <View className="items-center gap-3 py-16 px-4">
            <Text variant="display-lg" className="text-center">
              Your passport
            </Text>
            <Text variant="muted" className="text-center">
              Empty for now. Finish your first trip and it starts stamping itself —
              places, countries, airports, miles. Nothing to fill in.
            </Text>
            <Button label="Find a trip to join" onPress={() => router.push("/")} />
          </View>
        ) : (
          <>
            <View ref={cardRef} collapsable={false} style={{ gap: 12 }}>
              <View className="gap-0.5">
                <Text variant="display-lg">Passport</Text>
                {started ? <Text variant="muted">Started {started}</Text> : null}
              </View>
              <WorldMap pins={pins} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                {counters.map((c) => (
                  <Counter key={c.label} label={c.label} value={c.value} sub={c.sub} />
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Button label={busy ? "Exporting…" : "Share your passport"} variant="secondary" onPress={share} disabled={busy} />
              {msg ? (
                <Text variant="muted" className="text-center">
                  {msg}
                </Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </Boundary>
  );
}
