import { View, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/trip/countdown";
import { formatDateRange } from "@/lib/dates";
import { useTrip } from "@/hooks/use-trip";

// The trip dashboard shell — sections filled in by later phases.
const SECTIONS = [
  { key: "invites", title: "Invites", blurb: "Share a link and gather RSVPs." },
  { key: "travel", title: "Travel proof", blurb: "Confirm who's really coming — flight or driving." },
  { key: "money", title: "Money", blurb: "Track the Airbnb + car pools and your safe." },
  { key: "airbnb", title: "Airbnb pick", blurb: "Add options, vote, and lock the winner." },
  { key: "activities", title: "Activities", blurb: "Plan things to do and document the trip." },
];

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trip, loading, error, notAuthorized } = useTrip(id);

  return (
    <>
      <Stack.Screen options={{ title: trip?.title ?? "Trip" }} />
      {loading ? (
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator />
        </View>
      ) : notAuthorized ? (
        <View className="flex-1 items-center justify-center gap-3 bg-background p-6">
          <Text variant="heading">Not available</Text>
          <Text variant="muted" className="text-center">
            This trip doesn&apos;t exist or you&apos;re not a member.
          </Text>
          <Button label="Back to Trips" variant="outline" onPress={() => router.replace("/")} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center gap-3 bg-background p-6">
          <Text className="text-destructive">Couldn&apos;t load this trip.</Text>
          <Text variant="muted" className="text-center">
            {error}
          </Text>
        </View>
      ) : trip ? (
        <ScrollView
          className="flex-1 bg-background"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {trip.cover_url ? (
            <Image
              source={{ uri: trip.cover_url }}
              style={{ width: "100%", height: 200 }}
              contentFit="cover"
            />
          ) : (
            <View className="h-[200px] w-full items-center justify-center bg-muted">
              <Text variant="muted">No cover</Text>
            </View>
          )}

          <View className="gap-2 p-6">
            <Text variant="title">{trip.title}</Text>
            <Text variant="muted">{trip.location_city ?? "Destination TBD"}</Text>
            <Text variant="muted">
              {formatDateRange(trip.start_date, trip.end_date)}
            </Text>
            <Card className="mt-2 items-center gap-2">
              <Text variant="muted" className="text-xs uppercase tracking-widest">
                Countdown
              </Text>
              <Countdown target={trip.start_date} />
            </Card>
          </View>

          <View className="gap-3 px-6">
            <Text variant="heading">Trip dashboard</Text>
            {SECTIONS.map((s) => (
              <Card key={s.key} className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-semibold">{s.title}</Text>
                  <Text variant="muted" numberOfLines={1}>
                    {s.blurb}
                  </Text>
                </View>
                <View className="rounded-full bg-muted px-3 py-1">
                  <Text variant="muted" className="text-xs">
                    Coming soon
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>
      ) : null}
    </>
  );
}
