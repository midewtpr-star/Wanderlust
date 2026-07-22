import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Countdown } from "@/components/trip/countdown";
import { formatDateRange } from "@/lib/dates";
import { fontFamily } from "@/constants/theme";
import type { Trip } from "@/types";

export function TripCard({ trip, unread = 0 }: { trip: Trip; unread?: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/trip/${trip.id}`)}
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0 ? `${trip.title}, ${unread} unread messages` : trip.title
      }
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
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="heading" numberOfLines={1} className="flex-1">
            {trip.title}
          </Text>
          {unread > 0 ? (
            <View className="min-w-[22px] items-center justify-center rounded-full border border-primary bg-accent-fill px-1.5 py-0.5">
              <Text
                className="text-[11px] text-primary-foreground"
                style={{ fontFamily: fontFamily("semibold") }}
              >
                {unread > 99 ? "99+" : unread}
              </Text>
            </View>
          ) : null}
        </View>
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
