import { View, ScrollView, ActivityIndicator, Switch, Platform } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Boundary } from "@/components/ui/boundary";
import { PersonRow } from "@/components/profile/person-row";
import { useTheme } from "@/lib/theme-provider";
import { useNearby } from "@/hooks/use-nearby";

export default function NearbyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens: t } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { enabled, eligible, hasArea, areaLabel, travelers, loading, busy, error, toggle } = useNearby(id);

  const area = areaLabel ?? "this area";

  return (
    <Boundary variant="world">
      <Stack.Screen options={{ title: "Nearby travelers", headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator />
          </View>
        ) : !eligible ? (
          <View className="items-center gap-3 py-16 px-4">
            <Text variant="display-lg" className="text-center">
              Nearby is 18+
            </Text>
            <Text variant="muted" className="text-center">
              Confirm your age to find other travelers. We store only whether you are over 18 — never your date of birth.
            </Text>
            <Button label="Confirm your age" onPress={() => router.push("/profile-edit")} />
          </View>
        ) : !hasArea ? (
          <View className="items-center gap-3 py-16 px-4">
            <Text variant="display-lg" className="text-center">
              Set a destination first
            </Text>
            <Text variant="muted" className="text-center">
              Nearby matches travelers by your trip’s destination. Add one to the trip and check back.
            </Text>
          </View>
        ) : (
          <>
            {/* Opt-in — OFF by default */}
            <Card className="gap-3">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text variant="heading">Show me travelers near {area}</Text>
                  <Text variant="muted">Off by default. You choose when to appear.</Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(v) => {
                    void toggle(v);
                  }}
                  disabled={busy}
                  trackColor={{ true: t.accent, false: t.surface2 }}
                  thumbColor={Platform.OS === "android" ? (enabled ? t.accentInk : undefined) : undefined}
                />
              </View>
              <Text variant="caption">
                When on, other Trippl travelers heading to {area} during your dates can see your name, @handle and rough
                area — <Text variant="caption" style={{ fontWeight: "700" }}>never your live location</Text>. Turn it off
                anytime to disappear from their results immediately. To actually connect, both of you accept — same as
                anywhere on Trippl.
              </Text>
              {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
            </Card>

            {/* Matches — only when opted in */}
            {enabled ? (
              travelers.length > 0 ? (
                <View className="gap-2">
                  <Text variant="heading">
                    Also heading to {area}
                    {travelers.length ? ` · ${travelers.length}` : ""}
                  </Text>
                  {travelers.map((tr) => (
                    <PersonRow
                      key={tr.id}
                      name={tr.display_name}
                      handle={tr.handle}
                      avatarUrl={tr.avatar_url}
                      subtitle={tr.home_city}
                      onPress={() => router.push(`/profile/${tr.id}`)}
                    />
                  ))}
                </View>
              ) : (
                <View className="items-center gap-1 py-8 px-4">
                  <Text variant="heading" className="text-center">
                    No one yet
                  </Text>
                  <Text variant="muted" className="text-center">
                    No other travelers have opted in for {area} during your dates. Check back closer to the trip.
                  </Text>
                </View>
              )
            ) : null}
          </>
        )}
      </ScrollView>
    </Boundary>
  );
}
