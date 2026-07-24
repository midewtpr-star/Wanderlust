import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTripDistance } from "@/hooks/use-trip-distance";
import { formatMiles, METERS_PER_MILE } from "@/lib/geo";

// Explicit per-trip opt-in for distance tracking (feeds the recap's "miles"
// stat). Foreground-only for MVP; consent-gated. Never blocks anything.
export function DistanceOptIn({
  tripId,
  userId,
  withinWindow,
}: {
  tripId: string;
  userId: string;
  withinWindow: boolean;
}) {
  const dist = useTripDistance(tripId, userId, withinWindow);

  const groupMiles = dist.summary
    ? formatMiles(dist.summary.total_meters / METERS_PER_MILE)
    : "0 mi";

  return (
    <Card className="gap-2">
      <Text variant="heading">Track my distance</Text>
      <Text variant="muted" className="text-xs">
        Opt in to add your miles to the group recap. Foreground only for now —
        keep the trip open while traveling. Your individual distance stays
        private; only the group total is shown.
      </Text>

      {dist.loading ? (
        <View className="items-center py-2">
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <Button
            label={
              dist.optedIn
                ? "Tracking on ✓ — tap to opt out"
                : "Track my distance on this trip"
            }
            variant={dist.optedIn ? "secondary" : "default"}
            onPress={() => dist.setOptIn(!dist.optedIn)}
          />

          {dist.optedIn ? (
            withinWindow ? (
              dist.tracking ? (
                <View className="flex-row items-center justify-between">
                  <Text variant="muted" className="text-xs">
                    📍 Tracking (foreground)
                  </Text>
                  <Button
                    label="Stop"
                    variant="outline"
                    size="sm"
                    onPress={() => dist.stopTracking()}
                  />
                </View>
              ) : (
                <Button
                  label="Resume tracking"
                  variant="outline"
                  size="sm"
                  onPress={() => dist.startTracking()}
                />
              )
            ) : (
              <Text variant="muted" className="text-xs">
                Tracking runs during the trip dates.
              </Text>
            )
          ) : null}

          <Text variant="muted" className="text-xs">
            Group so far: {groupMiles} · {dist.summary?.tracked_count ?? 0} of{" "}
            {dist.summary?.member_count ?? 0} tracked
          </Text>
          {dist.error ? (
            <Text className="text-destructive text-xs">{dist.error}</Text>
          ) : null}
        </>
      )}
    </Card>
  );
}
