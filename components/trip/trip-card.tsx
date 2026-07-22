import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Countdown } from "@/components/trip/countdown";
import { formatDateRange } from "@/lib/dates";
import type { Trip } from "@/types";

export function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/trip/${trip.id}`)}
      className="overflow-hidden rounded-xl border border-border bg-card active:opacity-90"
    >
      {trip.cover_url ? (
        <Image
          source={{ uri: trip.cover_url }}
          style={{ width: "100%", height: 140 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View className="h-[140px] w-full items-center justify-center bg-muted">
          <Text variant="muted">No cover</Text>
        </View>
      )}
      <View className="gap-1 p-4">
        <Text variant="heading" numberOfLines={1}>
          {trip.title}
        </Text>
        <Text variant="muted" numberOfLines={1}>
          {trip.location_city ?? "Destination TBD"}
        </Text>
        <View className="mt-1 flex-row items-center justify-between">
          <Text variant="muted">
            {formatDateRange(trip.start_date, trip.end_date)}
          </Text>
          <Countdown target={trip.start_date} compact />
        </View>
      </View>
    </Pressable>
  );
}
