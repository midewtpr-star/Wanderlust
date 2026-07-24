import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Boundary } from "@/components/ui/boundary";
import { useTheme } from "@/lib/theme-provider";
import { useProfileView } from "@/hooks/use-profile-view";
import { provenanceLine } from "@/lib/social";
import type { PassportSummary } from "@/types";

// A compact outward passport summary (the B2 snapshot — aggregates only, no trip
// identifies). Shown on a viewable profile.
function PassportStrip({ p }: { p: PassportSummary }) {
  const { tokens: t } = useTheme();
  const tiles: [string, number][] = [
    ["Trips", p.trips],
    ["Places", p.places],
    ["Countries", p.countries],
    ["Continents", p.continents],
    ["Airports", p.airports],
    ["Miles", p.miles],
  ];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
      {tiles.map(([label, value]) => (
        <View
          key={label}
          style={{
            width: "31%",
            minWidth: 92,
            flexGrow: 1,
            alignItems: "center",
            paddingVertical: 10,
            borderRadius: t.radius,
            backgroundColor: t.tileBg,
            borderWidth: t.tileBorder?.width ?? 0,
            borderColor: t.tileBorder?.color,
          }}
        >
          <Text style={{ fontFamily: t.numFont, fontVariant: ["tabular-nums"], color: t.text, fontSize: 22, fontWeight: "800" }}>
            {value}
          </Text>
          <Text variant="caption">{label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { overview, state, isSelf, loading, notViewable, error, connect, accept, decline, remove, block, unblock } =
    useProfileView(id);

  return (
    <Boundary variant="world">
      <Stack.Screen options={{ title: "Profile", headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator />
          </View>
        ) : notViewable ? (
          <View className="items-center gap-3 py-16 px-4">
            <Avatar name={null} size={72} />
            <Text variant="display-lg" className="text-center">
              Private profile
            </Text>
            <Text variant="muted" className="text-center">
              {state === "outgoing"
                ? "Your connection request is pending."
                : state === "blocked"
                  ? "You've blocked this person."
                  : "This traveler keeps their profile private. Connect to see it."}
            </Text>
            {state === "none" ? <Button label="Connect" onPress={connect} /> : null}
            {state === "outgoing" ? <Button label="Cancel request" variant="outline" onPress={remove} /> : null}
            {state === "blocked" ? <Button label="Unblock" variant="outline" onPress={unblock} /> : null}
          </View>
        ) : overview ? (
          <>
            {/* Identity header (hero) */}
            <View className="items-center gap-2">
              <Avatar name={overview.profile.display_name} uri={overview.profile.avatar_url} size={88} />
              <View className="items-center gap-0.5">
                <Text variant="display-lg" className="text-center">
                  {overview.profile.display_name ?? "Traveler"}
                </Text>
                {overview.profile.handle ? <Text variant="muted">@{overview.profile.handle}</Text> : null}
                {overview.profile.home_city ? (
                  <Text variant="muted">📍 {overview.profile.home_city}</Text>
                ) : null}
              </View>
              {provenanceLine(overview.provenance.length, overview.mutualCount) ? (
                <Text variant="caption" className="text-center">
                  {provenanceLine(overview.provenance.length, overview.mutualCount)}
                </Text>
              ) : null}
            </View>

            {overview.profile.bio ? (
              <Card>
                <Text>{overview.profile.bio}</Text>
              </Card>
            ) : null}

            {/* Relationship actions */}
            {!isSelf ? (
              <View className="gap-2">
                {state === "none" ? <Button label="Connect" onPress={connect} /> : null}
                {state === "outgoing" ? (
                  <Button label="Requested — cancel" variant="outline" onPress={remove} />
                ) : null}
                {state === "incoming" ? (
                  <View className="gap-2">
                    <Button label="Accept request" onPress={accept} />
                    <Button label="Decline" variant="ghost" onPress={decline} />
                  </View>
                ) : null}
                {state === "connected" ? (
                  <Button label="✓ Connected — remove" variant="secondary" onPress={remove} />
                ) : null}
                {state === "blocked" ? (
                  <Button label="Unblock" variant="outline" onPress={unblock} />
                ) : null}
                {state !== "blocked" ? (
                  <Pressable onPress={block} accessibilityRole="button" className="active:opacity-70 self-center">
                    <Text variant="caption" style={{ textDecorationLine: "underline" }}>
                      Block this person
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Button label="Edit your profile" variant="outline" onPress={() => router.push("/profile-edit")} />
            )}

            {/* Outward passport summary (aggregates only) */}
            {overview.passport ? (
              <View className="gap-2">
                <Text variant="heading">Passport</Text>
                <PassportStrip p={overview.passport} />
              </View>
            ) : null}

            {/* How you're connected — shared trips (both are members; not content) */}
            {overview.provenance.length > 0 ? (
              <View className="gap-2">
                <Text variant="heading">Traveled together</Text>
                {overview.provenance.map((tr) => (
                  <Pressable
                    key={tr.trip_id}
                    onPress={() => router.push(`/trip/${tr.trip_id}`)}
                    accessibilityRole="button"
                  >
                    <Card className="flex-row items-center justify-between active:opacity-90">
                      <Text variant="heading" numberOfLines={1} className="flex-1 pr-3">
                        {tr.title}
                      </Text>
                      <Text variant="muted" className="text-xl">
                        ›
                      </Text>
                    </Card>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {error ? (
              <Text variant="muted" className="text-center">
                {error}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Boundary>
  );
}
