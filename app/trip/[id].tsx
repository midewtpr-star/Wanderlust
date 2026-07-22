import { useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/trip/countdown";
import { RsvpControl } from "@/components/trip/rsvp-control";
import { RsvpWall } from "@/components/trip/rsvp-wall";
import { InviteModal } from "@/components/trip/invite-modal";
import { TravelProofCard } from "@/components/trip/travel-proof-card";
import { MoneySection } from "@/components/trip/money-section";
import { PersonalSafeCard } from "@/components/trip/personal-safe-card";
import { StepChecklist } from "@/components/trip/step-checklist";
import { formatDateRange } from "@/lib/dates";
import { useAuth } from "@/lib/auth-provider";
import { useTrip } from "@/hooks/use-trip";
import { useTripMembers } from "@/hooks/use-trip-members";
import { useRsvp } from "@/hooks/use-rsvp";
import { useInvite } from "@/hooks/use-invite";
import type { RsvpStatus } from "@/types";

// Remaining dashboard sections (filled in by later phases).
const SECTIONS = [
  { key: "airbnb", title: "Airbnb pick", blurb: "Add options, vote, and lock the winner." },
  { key: "activities", title: "Activities", blurb: "Plan things to do and document the trip." },
];

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { trip, loading, error, notAuthorized } = useTrip(id);
  const members = useTripMembers(id);
  const rsvp = useRsvp(id, user?.id);
  const invite = useInvite(id);
  const [inviteOpen, setInviteOpen] = useState(false);
  // Bumped when travel proof or a money step completes, so the checklist refetches.
  const [moneyVersion, setMoneyVersion] = useState(0);
  const bumpChecklist = () => setMoneyVersion((v) => v + 1);

  // Admin = host or admin on the roster. The server (SECURITY DEFINER RPCs +
  // RLS) is the real gate; this only decides what to show.
  const me = members.members.find((m) => m.user_id === user?.id);
  const isAdmin = me?.role === "host" || me?.role === "admin";

  async function onPickRsvp(next: RsvpStatus) {
    if (!user) return;
    members.setLocalRsvp(user.id, next); // optimistic wall update
    await rsvp.setStatus(next); // optimistic control + persist
    members.refresh(); // reconcile with the server
  }

  async function openInvite() {
    if (!user) return;
    setInviteOpen(true);
    await invite.ensureInvite(user.id);
  }

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

          <View className="gap-2 px-6 pb-4">
            <Text variant="heading">Your RSVP</Text>
            <RsvpControl value={rsvp.status} onChange={onPickRsvp} disabled={rsvp.saving} />
          </View>

          <View className="gap-3 px-6 pb-4">
            <View className="flex-row items-center justify-between">
              <Text variant="heading">Who&apos;s coming</Text>
              <Button label="Invite people" size="sm" onPress={openInvite} />
            </View>
            {members.loading ? (
              <Card>
                <View className="items-center py-4">
                  <ActivityIndicator />
                </View>
              </Card>
            ) : members.error ? (
              <Card>
                <Text className="text-destructive">{members.error}</Text>
              </Card>
            ) : (
              <RsvpWall groups={members.groups} />
            )}
          </View>

          {user ? (
            <View className="gap-3 px-6 pb-4">
              <Text variant="heading">Travel proof</Text>
              <TravelProofCard
                tripId={trip.id}
                userId={user.id}
                isAdmin={isAdmin}
                members={members.members}
                onStepChange={bumpChecklist}
              />
            </View>
          ) : null}

          {user ? (
            <View className="gap-3 px-6 pb-4">
              <Text variant="heading">Money</Text>
              <MoneySection
                trip={trip}
                userId={user.id}
                isAdmin={isAdmin}
                members={members.members}
                onChanged={bumpChecklist}
              />
            </View>
          ) : null}

          {user ? (
            <View className="gap-3 px-6 pb-4">
              <PersonalSafeCard
                tripId={trip.id}
                userId={user.id}
                defaultUnlockDate={trip.start_date}
              />
            </View>
          ) : null}

          {user ? (
            <View className="gap-3 px-6 pb-4">
              <StepChecklist
                tripId={trip.id}
                userId={user.id}
                hasCarPool={!!trip.car_rental_ref}
                version={moneyVersion}
              />
            </View>
          ) : null}

          <View className="gap-3 px-6">
            <Text variant="heading">More</Text>
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

      <InviteModal
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        loading={invite.loading}
        error={invite.error}
        webUrl={invite.links?.webUrl ?? null}
        nativeUrl={invite.links?.nativeUrl ?? null}
        shareUrl={invite.links?.shareUrl ?? null}
      />
    </>
  );
}
