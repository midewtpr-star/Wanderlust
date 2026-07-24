import { useCallback, useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RsvpControl } from "@/components/trip/rsvp-control";
import { RsvpWall } from "@/components/trip/rsvp-wall";
import { InviteModal } from "@/components/trip/invite-modal";
import { TravelProofCard } from "@/components/trip/travel-proof-card";
import { MoneySection } from "@/components/trip/money-section";
import { PersonalSafeCard } from "@/components/trip/personal-safe-card";
import { StepChecklist } from "@/components/trip/step-checklist";
import { AirbnbSection } from "@/components/trip/airbnb-section";
import { AdminManagement } from "@/components/trip/admin-management";
import { ProgressPanel } from "@/components/trip/progress-panel";
import { VerifiedCelebration } from "@/components/trip/verified-celebration";
import { LocalIdeas } from "@/components/trip/local-ideas";
import { ActivitiesSection } from "@/components/trip/activities-section";
import { DistanceOptIn } from "@/components/trip/distance-opt-in";
import { ChatEntry } from "@/components/chat/chat-entry";
import { OutfitEntry } from "@/components/outfits/outfit-entry";
import { BringEntry } from "@/components/bring/bring-entry";
import { JournalCard } from "@/components/journal/journal-card";
import { TripThemeProvider } from "@/lib/trip-theme";
import { SkinTripHeader } from "@/components/trip/skin-trip-header";
import { TripThemeSection } from "@/components/trip/trip-theme-section";
import { formatDateRange, toISODate } from "@/lib/dates";
import { useAuth } from "@/lib/auth-provider";
import { useTrip } from "@/hooks/use-trip";
import { useTripMembers } from "@/hooks/use-trip-members";
import { useRsvp } from "@/hooks/use-rsvp";
import { useInvite } from "@/hooks/use-invite";
import { useMemberVerification } from "@/hooks/use-member-verification";
import { useUnreadCounts } from "@/hooks/use-unread";
import { useOutfitCount } from "@/hooks/use-outfits";
import { useBringCount } from "@/hooks/use-bring-list";
import { useJournalCount } from "@/hooks/use-journal";
import type { ActivityInput, RsvpStatus } from "@/types";

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { trip, loading, error, notAuthorized, refresh: refreshTrip } = useTrip(id);
  const members = useTripMembers(id);
  const rsvp = useRsvp(id, user?.id);
  const invite = useInvite(id);
  const { counts: unreadCounts, refresh: refreshUnread } = useUnreadCounts();
  const { count: outfitCount, refresh: refreshOutfitCount } = useOutfitCount(id);
  const { count: bringCount, refresh: refreshBringCount } = useBringCount(id);
  const { count: journalCount, refresh: refreshJournalCount } = useJournalCount(id);
  // Refresh the entry badges whenever the screen refocuses (e.g. returning from
  // the chat, the outfit board, the bring list, or the journal).
  useFocusEffect(
    useCallback(() => {
      refreshUnread();
      refreshOutfitCount();
      refreshBringCount();
      refreshJournalCount();
    }, [refreshUnread, refreshOutfitCount, refreshBringCount, refreshJournalCount]),
  );
  const [inviteOpen, setInviteOpen] = useState(false);
  // Bumped when travel proof or a money step completes, so the checklist +
  // verification + progress panel refetch.
  const [moneyVersion, setMoneyVersion] = useState(0);
  const bumpChecklist = () => setMoneyVersion((v) => v + 1);
  // "Add to activities" from a local idea → prefill the activity form.
  const [ideaPrefill, setIdeaPrefill] = useState<ActivityInput | null>(null);
  const consumePrefill = useCallback(() => setIdeaPrefill(null), []);

  const hasCarPool = !!trip?.car_rental_ref;
  const verification = useMemberVerification(id, hasCarPool, moneyVersion);
  const currentUserVerified = user
    ? verification.statusFor(user.id).verified
    : false;

  // Admin = host or admin on the roster. The server (SECURITY DEFINER RPCs +
  // RLS) is the real gate; this only decides what to show.
  const me = members.members.find((m) => m.user_id === user?.id);
  const isAdmin = me?.role === "host" || me?.role === "admin";
  const isHost = me?.role === "host";

  // Recap unlocks once the trip has started; distance tracks within the window.
  const today = toISODate(new Date());
  const startPassed = !!trip?.start_date && today >= trip.start_date;
  const recapAvailable = !!trip && (trip.status === "completed" || startPassed);
  const withinWindow =
    startPassed && (!trip?.end_date || today <= trip.end_date);

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
        <TripThemeProvider tripId={id}>
        <ScrollView
          className="flex-1 bg-background"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="relative">
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
            <SkinTripHeader />
          </View>

          <View className="gap-2 p-6">
            <Text variant="title">{trip.title}</Text>
            <Text variant="muted">{trip.location_city ?? "Destination TBD"}</Text>
            <Text variant="muted">
              {formatDateRange(trip.start_date, trip.end_date)}
            </Text>
            <View className="mt-2">
              <ProgressPanel
                trip={trip}
                goingCount={members.counts.going}
                verifiedCount={verification.verifiedCount}
                memberCount={members.members.length}
                version={moneyVersion}
              />
            </View>
          </View>

          <View className="gap-3 px-6 pb-4">
            <ChatEntry
              unread={unreadCounts[trip.id] ?? 0}
              onPress={() => router.push(`/chat/${trip.id}`)}
            />
            <OutfitEntry
              count={outfitCount}
              onPress={() => router.push(`/outfits/${trip.id}`)}
            />
            <BringEntry
              count={bringCount}
              onPress={() => router.push(`/bring/${trip.id}`)}
            />
            <JournalCard
              count={journalCount}
              onPress={() => router.push(`/journal/${trip.id}`)}
            />
          </View>

          <TripThemeSection trip={trip} isAdmin={isAdmin} />

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
              <RsvpWall groups={members.groups} statusFor={verification.statusFor} />
            )}
            {isHost ? (
              <AdminManagement
                members={members.members}
                tripId={trip.id}
                onChange={members.refresh}
              />
            ) : null}
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
              <Text variant="heading">Airbnb pick</Text>
              <AirbnbSection
                trip={trip}
                userId={user.id}
                isAdmin={isAdmin}
                members={members.members}
                onTripChange={refreshTrip}
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

          {user ? (
            <View className="gap-3 px-6 pb-4">
              <Text variant="heading">Explore nearby</Text>
              <LocalIdeas
                tripId={trip.id}
                lat={trip.location_lat}
                lng={trip.location_lng}
                onUseIdea={setIdeaPrefill}
              />
            </View>
          ) : null}

          {user ? (
            <View className="gap-3 px-6 pb-4">
              <Text variant="heading">Activities</Text>
              <ActivitiesSection
                tripId={trip.id}
                userId={user.id}
                prefill={ideaPrefill}
                onPrefillConsumed={consumePrefill}
              />
            </View>
          ) : null}

          {user ? (
            <View className="gap-3 px-6 pb-4">
              <Text variant="heading">Trip recap</Text>
              <DistanceOptIn
                tripId={trip.id}
                userId={user.id}
                withinWindow={withinWindow}
              />
              {recapAvailable ? (
                <Button
                  label="Open trip recap →"
                  onPress={() => router.push(`/recap/${trip.id}`)}
                />
              ) : (
                <Card>
                  <Text variant="muted" className="text-center">
                    Your recap — photo collage + trip stats — unlocks once the
                    trip starts.
                  </Text>
                </Card>
              )}
            </View>
          ) : null}
        </ScrollView>
        </TripThemeProvider>
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

      {user && trip ? (
        <VerifiedCelebration
          verified={currentUserVerified}
          tripId={trip.id}
          userId={user.id}
        />
      ) : null}
    </>
  );
}
