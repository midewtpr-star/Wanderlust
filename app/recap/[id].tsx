import { useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { CollageView } from "@/components/trip/collage-view";
import { StatTiles } from "@/components/trip/stat-tiles";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import { useTrip } from "@/hooks/use-trip";
import { useTripStats } from "@/hooks/use-trip-stats";
import { useTripRecap } from "@/hooks/use-trip-recap";
import { uploadTripMedia, signedTripMediaUrl } from "@/lib/storage";
import { shareImage } from "@/lib/share";
import { formatDateRange, toISODate } from "@/lib/dates";

const CAPTURE = {
  format: "png" as const,
  quality: 0.9,
  result: Platform.OS === "web" ? ("data-uri" as const) : ("tmpfile" as const),
};

export default function RecapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { trip, loading: tripLoading, notAuthorized } = useTrip(id);
  const stats = useTripStats(id, trip);
  const recap = useTripRecap(id);

  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState<"gen" | "share" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const cardRef = useRef<View>(null);
  const collageRef = useRef<View>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) return;
      const { data } = await supabase
        .from("activity_media")
        .select("url")
        .eq("trip_id", id)
        .eq("media_type", "photo")
        .order("created_at", { ascending: false })
        .limit(12);
      const urls = await Promise.all(
        ((data ?? []) as { url: string | null }[]).map((m) =>
          m.url ? signedTripMediaUrl(m.url) : Promise.resolve(null),
        ),
      );
      if (active) setPhotos(urls.filter((u): u is string => !!u));
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const startPassed = trip?.start_date
    ? toISODate(new Date()) >= trip.start_date
    : false;
  const available = trip?.status === "completed" || startPassed;

  async function generate() {
    if (!stats.stats || !user || !id) return;
    setBusy("gen");
    setMsg(null);
    // Keep any prior collage if capture fails (stats-only stays valid).
    let collagePath: string | null = recap.recap?.collage_url ?? null;
    try {
      if (photos.length > 0 && collageRef.current) {
        const { captureRef } = await import("react-native-view-shot");
        const uri = await captureRef(collageRef, CAPTURE);
        collagePath = await uploadTripMedia(
          { uri, name: "recap-collage.png", mimeType: "image/png" },
          id,
          user.id,
        );
      }
    } catch {
      // capture/upload failed — proceed stats-only
    }
    const ok = await recap.save(stats.stats, collagePath);
    setBusy(null);
    setMsg(ok ? "Recap saved." : "Couldn't save the recap — try again.");
  }

  async function share() {
    setBusy("share");
    setMsg(null);
    try {
      const { captureRef } = await import("react-native-view-shot");
      const uri = await captureRef(cardRef, CAPTURE);
      const r = await shareImage(uri);
      setMsg(
        r === "shared"
          ? "Shared!"
          : r === "downloaded"
            ? "Downloaded the recap image."
            : "Sharing isn't available here — screenshot the recap to share.",
      );
    } catch {
      setMsg("Couldn't export the recap image.");
    }
    setBusy(null);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Trip recap" }} />
      {tripLoading ? (
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator />
        </View>
      ) : notAuthorized || !trip ? (
        <View className="flex-1 items-center justify-center gap-2 bg-background p-6">
          <Text variant="heading">Not available</Text>
          <Text variant="muted" className="text-center">
            This trip doesn&apos;t exist or you&apos;re not a member.
          </Text>
        </View>
      ) : !available ? (
        <View className="flex-1 items-center justify-center gap-2 bg-background p-6">
          <Text variant="heading">Recap not ready yet</Text>
          <Text variant="muted" className="text-center">
            Your trip recap unlocks once the trip has started.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-background"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
        >
          {/* The shareable "trip story" card. */}
          <View ref={cardRef} collapsable={false} className="gap-4 rounded-2xl bg-card p-4">
            <View className="gap-1">
              {trip.cover_url ? (
                <Image
                  source={{ uri: trip.cover_url }}
                  style={{ width: "100%", height: 140, borderRadius: 12 }}
                  contentFit="cover"
                />
              ) : null}
              <Text variant="title" className="mt-2">
                {trip.title}
              </Text>
              <Text variant="muted">{trip.location_city ?? ""}</Text>
              <Text variant="muted">
                {formatDateRange(trip.start_date, trip.end_date)}
              </Text>
            </View>

            <View ref={collageRef} collapsable={false} className="rounded-xl bg-card">
              <CollageView photos={photos} />
            </View>

            {stats.loading || !stats.stats ? (
              <View className="items-center py-4">
                <ActivityIndicator />
              </View>
            ) : (
              <StatTiles stats={stats.stats} />
            )}

            <Text variant="muted" className="text-center text-xs">
              {trip.title} · a trip recap
            </Text>
          </View>

          <View className="gap-2">
            <Button
              label={
                busy === "gen"
                  ? "Generating…"
                  : recap.recap?.generated_at
                    ? "Regenerate recap"
                    : "Generate recap"
              }
              disabled={busy !== null || stats.loading}
              onPress={generate}
            />
            <Button
              label={busy === "share" ? "Exporting…" : "Share / download recap"}
              variant="secondary"
              disabled={busy !== null}
              onPress={share}
            />
            {recap.recap?.generated_at ? (
              <Text variant="muted" className="text-center text-xs">
                Last generated {formatDateRange(
                  recap.recap.generated_at.slice(0, 10),
                  recap.recap.generated_at.slice(0, 10),
                )}
              </Text>
            ) : null}
            {msg ? (
              <Text variant="muted" className="text-center">
                {msg}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </>
  );
}
