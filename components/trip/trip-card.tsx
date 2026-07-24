import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Countdown } from "@/components/trip/countdown";
import { HardShadow } from "@/components/ui/hard-shadow";
import { useTheme } from "@/lib/theme-provider";
import { formatDateRange } from "@/lib/dates";
import { fontFamily } from "@/constants/theme";
import type { Trip } from "@/types";

// A trip in the Trips list — a hero surface, so the active skin is loud here:
// token surface + radius, and (collage) a hard offset shadow via <HardShadow>.
export function TripCard({ trip, unread = 0 }: { trip: Trip; unread?: number }) {
  const router = useRouter();
  const { tokens: t } = useTheme();
  return (
    <HardShadow radius={t.radius}>
      <Pressable
        onPress={() => router.push(`/trip/${trip.id}`)}
        accessibilityRole="button"
        accessibilityLabel={
          unread > 0 ? `${trip.title}, ${unread} unread messages` : trip.title
        }
        className="active:opacity-90"
        style={{
          overflow: "hidden",
          borderRadius: t.radius,
          borderWidth: t.cardBorder?.width ?? 0,
          borderColor: t.cardBorder?.color,
          backgroundColor: t.cardBg,
        }}
      >
        {trip.cover_url ? (
          <Image
            source={{ uri: trip.cover_url }}
            style={{ width: "100%", height: 140 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={{ height: 140, backgroundColor: t.tileBg }} className="w-full items-center justify-center">
            <Text variant="muted">No cover</Text>
          </View>
        )}
        <View className="gap-1 p-4">
          <View className="flex-row items-center justify-between gap-2">
            <Text variant="heading" numberOfLines={1} className="flex-1">
              {trip.title}
            </Text>
            {unread > 0 ? (
              <View
                style={{ backgroundColor: t.accentBg, borderRadius: 999 }}
                className="min-w-[22px] items-center justify-center px-1.5 py-0.5"
              >
                <Text
                  className="text-[11px]"
                  style={{ color: t.accentInk, fontFamily: fontFamily("semibold") }}
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
    </HardShadow>
  );
}
