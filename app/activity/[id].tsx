import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { TripThemeProvider } from "@/lib/trip-theme";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { MediaUploader } from "@/components/trip/media-uploader";
import { MediaGallery } from "@/components/trip/media-gallery";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import { useActivityMedia } from "@/hooks/use-activity-media";
import { formatDate } from "@/lib/dates";
import type { Activity } from "@/types";

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("activities")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!data) setNotFound(true);
    else setActivity(data as Activity);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const media = useActivityMedia(
    id,
    activity?.trip_id,
    user?.id,
  );

  return (
    <TripThemeProvider tripId={activity?.trip_id}>
      <Stack.Screen options={{ title: activity?.title ?? "Activity" }} />
      {loading ? (
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator />
        </View>
      ) : notFound || !activity ? (
        <View className="flex-1 items-center justify-center gap-2 bg-background p-6">
          <Text variant="heading">Not available</Text>
          <Text variant="muted" className="text-center">
            This activity doesn&apos;t exist or you&apos;re not a member of its
            trip.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-background"
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24, gap: 16 }}
        >
          <View className="gap-1">
            <Text variant="title">{activity.title}</Text>
            <Text variant="muted">
              {activity.scheduled_for
                ? formatDate(activity.scheduled_for.slice(0, 10))
                : "Anytime"}
              {activity.location ? ` · ${activity.location}` : ""}
            </Text>
            {activity.description ? (
              <Text className="mt-1">{activity.description}</Text>
            ) : null}
            {activity.url ? (
              <Pressable onPress={() => WebBrowser.openBrowserAsync(activity.url!)}>
                <Text className="text-primary">Open link ↗</Text>
              </Pressable>
            ) : null}
          </View>

          {user ? (
            <MediaUploader onUpload={media.upload} progress={media.progress} />
          ) : null}

          {media.loading ? (
            <Card>
              <View className="items-center py-4">
                <ActivityIndicator />
              </View>
            </Card>
          ) : media.error ? (
            <Card>
              <Text className="text-destructive">{media.error}</Text>
            </Card>
          ) : (
            <MediaGallery
              media={media.media}
              currentUserId={user?.id ?? ""}
              onRemove={media.remove}
            />
          )}
        </ScrollView>
      )}
    </TripThemeProvider>
  );
}
