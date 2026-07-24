import { useCallback } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TripCard } from "@/components/trip/trip-card";
import { ScreenGround } from "@/components/ui/screen-ground";
import { useTrips } from "@/hooks/use-trips";
import { useUnreadCounts } from "@/hooks/use-unread";

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trips, loading, refreshing, error, reload, refresh } = useTrips();
  const { counts: unread, refresh: refreshUnread } = useUnreadCounts();

  // Reload on tab focus so a newly created trip (and unread counts) appear.
  useFocusEffect(
    useCallback(() => {
      reload();
      refreshUnread();
    }, [reload, refreshUnread]),
  );

  return (
    <ScreenGround style={{ paddingTop: insets.top }}>
      <View className="px-6 pb-2 pt-4">
        <Text variant="display-lg">Trips</Text>
      </View>

      {loading ? (
        <View className="gap-4 p-6">
          {[0, 1, 2].map((i) => (
            <View key={i} className="overflow-hidden rounded-xl border border-border">
              <Skeleton height={140} radius={0} />
              <View className="gap-2 p-4">
                <Skeleton height={18} width="60%" />
                <Skeleton height={14} width="40%" />
              </View>
            </View>
          ))}
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text className="text-destructive">Couldn&apos;t load trips.</Text>
          <Text variant="muted" className="text-center">
            {error}
          </Text>
          <Button label="Try again" variant="outline" onPress={reload} />
        </View>
      ) : trips.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text variant="heading">No trips yet</Text>
          <Text variant="muted" className="text-center">
            Create your first trip and invite the group.
          </Text>
          <Button label="Create a trip" onPress={() => router.push("/create")} />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TripCard trip={item} unread={unread[item.id] ?? 0} />
          )}
          contentContainerClassName="gap-4 p-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
        />
      )}
    </ScreenGround>
  );
}
