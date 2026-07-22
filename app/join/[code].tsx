import { useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { RsvpControl } from "@/components/trip/rsvp-control";
import { Countdown } from "@/components/trip/countdown";
import { LogoSlot } from "@/components/logo-slot";
import { formatDateRange } from "@/lib/dates";
import { useAuth } from "@/lib/auth-provider";
import { useTripPreview } from "@/hooks/use-trip-preview";
import { useJoinTrip } from "@/hooks/use-join-trip";
import { useRsvp } from "@/hooks/use-rsvp";
import type { RsvpStatus } from "@/types";

// Public invite landing (deep link: trippl://join/<code> or <web-origin>/join/<code>).
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, user } = useAuth();
  const { preview, loading, error } = useTripPreview(code);
  const { join, joining, error: joinError } = useJoinTrip();
  const [joinedTripId, setJoinedTripId] = useState<string | null>(null);
  const { setStatus, saving } = useRsvp(joinedTripId ?? undefined, user?.id);

  async function onJoin() {
    if (!code) return;
    if (!session) {
      // Preserve the code and return here after signing in.
      router.push(`/sign-in?redirect=${encodeURIComponent(`/join/${code}`)}`);
      return;
    }
    const tripId = await join(code);
    if (tripId) setJoinedTripId(tripId);
  }

  async function onPickRsvp(status: RsvpStatus) {
    const ok = await setStatus(status);
    if (ok && joinedTripId) router.replace(`/trip/${joinedTripId}`);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Trip invite", headerShown: true }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {loading ? (
          <View className="items-center justify-center py-24">
            <ActivityIndicator />
          </View>
        ) : error || !preview ? (
          <View className="items-center justify-center gap-3 p-6 py-24">
            <Text variant="heading">Invite not found</Text>
            <Text variant="muted" className="text-center">
              {error ?? "This invite is invalid or has expired."}
            </Text>
            <Button
              label="Go home"
              variant="outline"
              onPress={() => router.replace(session ? "/" : "/sign-in")}
            />
          </View>
        ) : (
          <>
            {preview.cover_url ? (
              <Image
                source={{ uri: preview.cover_url }}
                style={{ width: "100%", height: 200 }}
                contentFit="cover"
              />
            ) : (
              <View className="h-[200px] w-full items-center justify-center bg-muted">
                <Text variant="muted">No cover</Text>
              </View>
            )}
            <View className="gap-3 p-6">
              <LogoSlot />
              <Text variant="muted">You&apos;re invited to</Text>
              <Text variant="title">{preview.title}</Text>
              <Text variant="muted">{preview.location_city ?? "Destination TBD"}</Text>
              <Text variant="muted">
                {formatDateRange(preview.start_date, preview.end_date)}
              </Text>
              <Card className="items-center gap-2">
                <Text variant="muted" className="text-xs uppercase tracking-widest">
                  Countdown
                </Text>
                <Countdown target={preview.start_date} />
              </Card>

              <View className="gap-2">
                <Text className="font-semibold">Going ({preview.going_count})</Text>
                {preview.going_members.length === 0 ? (
                  <Text variant="muted" className="text-xs">
                    Be the first to say you&apos;re going.
                  </Text>
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {preview.going_members.map((g, i) => (
                      <View
                        key={i}
                        className="flex-row items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3"
                      >
                        <Avatar name={g.display_name} uri={g.avatar_url} size={24} />
                        <Text className="text-xs">{g.display_name ?? "Member"}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {joinedTripId ? (
                <View className="gap-2">
                  <Text className="font-semibold">
                    You&apos;re in! Are you going?
                  </Text>
                  <RsvpControl value={null} onChange={onPickRsvp} disabled={saving} />
                  {saving ? (
                    <View className="mt-1 items-center">
                      <ActivityIndicator />
                    </View>
                  ) : null}
                </View>
              ) : (
                <View className="gap-2">
                  <Button
                    label={joining ? "Joining…" : "Join this trip"}
                    disabled={joining}
                    onPress={onJoin}
                  />
                  {!session ? (
                    <Text variant="muted" className="text-center text-xs">
                      You&apos;ll sign in first, then come right back.
                    </Text>
                  ) : null}
                  {joinError ? (
                    <Text className="text-center text-destructive">{joinError}</Text>
                  ) : null}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}
