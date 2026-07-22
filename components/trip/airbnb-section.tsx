import { useMemo, useState } from "react";
import { View, ActivityIndicator, Pressable } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OptionVoteCard } from "./option-vote-card";
import { AddOptionForm } from "./add-option-form";
import { useAirbnbVotes } from "@/hooks/use-airbnb-votes";
import { useLockPick } from "@/hooks/use-lock-pick";
import { formatCents } from "@/lib/money";
import type { MemberWithRsvp, Trip } from "@/types";

// Airbnb voting + admin lock. Votes inform; the admin makes the official call.
// When locked, the official stay shows prominently and voting goes read-only.
export function AirbnbSection({
  trip,
  userId,
  isAdmin,
  members,
  onTripChange,
}: {
  trip: Trip;
  userId: string;
  isAdmin: boolean;
  members: MemberWithRsvp[];
  onTripChange: () => void;
}) {
  const votes = useAirbnbVotes(trip.id, userId);
  const lockPick = useLockPick(trip.id);
  const [confirmUnlock, setConfirmUnlock] = useState(false);

  const locked = trip.status === "locked" && !!trip.airbnb_pick;
  const memberById = useMemo(() => {
    const m = new Map<string, MemberWithRsvp>();
    members.forEach((x) => m.set(x.user_id, x));
    return m;
  }, [members]);

  const votersFor = (optionId: string): MemberWithRsvp[] =>
    (votes.votesByOption.get(optionId) ?? [])
      .map((uid) => memberById.get(uid))
      .filter((x): x is MemberWithRsvp => !!x);

  async function onLock(optionId: string) {
    const option = votes.options.find((o) => o.id === optionId);
    if (!option) return;
    const ok = await lockPick.lock(option, trip.start_date);
    if (ok) {
      onTripChange(); // trip.status/airbnb_pick change → money pool reloads
      votes.refresh();
    }
  }

  async function onUnlock() {
    const ok = await lockPick.unlock();
    setConfirmUnlock(false);
    if (ok) {
      onTripChange();
      votes.refresh();
    }
  }

  if (votes.loading) {
    return (
      <Card>
        <View className="items-center py-4">
          <ActivityIndicator />
        </View>
      </Card>
    );
  }

  // --- Locked: show the official stay + read-only tallies ---
  if (locked) {
    const official = votes.options.find((o) => o.id === trip.airbnb_pick) ?? null;
    const costCents =
      official?.total_cost != null ? Math.round(official.total_cost * 100) : null;
    return (
      <View className="gap-3">
        <Card className="gap-3 border-green-500">
          <Text variant="muted" className="text-xs uppercase tracking-widest">
            Official stay
          </Text>
          {official?.image_url ? (
            <Image
              source={{ uri: official.image_url }}
              style={{ width: "100%", height: 170, borderRadius: 10 }}
              contentFit="cover"
            />
          ) : null}
          <Text variant="heading">{official?.title || "Locked pick"}</Text>
          {costCents != null ? (
            <Text variant="muted">
              {formatCents(costCents)} total · feeds the Airbnb pool
            </Text>
          ) : null}
          {official?.url ? (
            <Pressable onPress={() => WebBrowser.openBrowserAsync(official.url!)}>
              <Text className="text-primary">Open listing ↗</Text>
            </Pressable>
          ) : null}

          {isAdmin ? (
            confirmUnlock ? (
              <View className="gap-2">
                <Text variant="muted" className="text-xs">
                  Unlock reopens voting and sets the trip back to planning.
                </Text>
                <View className="flex-row gap-2">
                  <Button
                    label={lockPick.saving ? "Unlocking…" : "Confirm unlock"}
                    variant="destructive"
                    disabled={lockPick.saving}
                    className="flex-1"
                    onPress={onUnlock}
                  />
                  <Button
                    label="Keep locked"
                    variant="outline"
                    onPress={() => setConfirmUnlock(false)}
                  />
                </View>
              </View>
            ) : (
              <Button
                label="Unlock / change pick"
                variant="outline"
                onPress={() => setConfirmUnlock(true)}
              />
            )
          ) : null}
        </Card>

        {/* Read-only tallies remain visible */}
        <Text variant="muted" className="text-xs">
          Voting is closed. Final tallies:
        </Text>
        {votes.options.map((o) => {
          const voters = votersFor(o.id);
          return (
            <Card key={o.id} className="flex-row items-center justify-between">
              <Text numberOfLines={1} className="flex-1 pr-2">
                {o.id === trip.airbnb_pick ? "✅ " : ""}
                {o.title || "Option"}
              </Text>
              <Text variant="muted" className="text-xs">
                {voters.length} vote{voters.length === 1 ? "" : "s"}
              </Text>
            </Card>
          );
        })}
        {lockPick.error ? (
          <Text className="text-destructive">{lockPick.error}</Text>
        ) : null}
      </View>
    );
  }

  // --- Voting open ---
  return (
    <View className="gap-3">
      {votes.options.length === 0 ? (
        <Card>
          <Text variant="muted">
            No options yet. Add an Airbnb below for the group to vote on.
          </Text>
        </Card>
      ) : (
        votes.options.map((o) => (
          <OptionVoteCard
            key={o.id}
            option={o}
            voted={votes.myVote === o.id}
            voters={votersFor(o.id)}
            isAdmin={isAdmin}
            locked={false}
            official={false}
            voteSaving={votes.loading}
            lockSaving={lockPick.saving}
            onVote={() => votes.vote(o.id)}
            onLock={() => onLock(o.id)}
          />
        ))
      )}

      <AddOptionForm onAdd={votes.addOption} />

      {isAdmin ? (
        <Text variant="muted" className="text-xs">
          Votes inform your call — lock any option to make it official.
        </Text>
      ) : null}
      {(votes.error || lockPick.error) ? (
        <Text className="text-destructive">{votes.error ?? lockPick.error}</Text>
      ) : null}
    </View>
  );
}
