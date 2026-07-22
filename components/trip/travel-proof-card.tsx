import { useState } from "react";
import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTravelProof } from "@/hooks/use-travel-proof";
import { useTravelStatus } from "@/hooks/use-travel-status";
import { DrivingConfirm } from "./driving-confirm";
import { FlightVerify } from "./flight-verify";
import { TravelStatusWall } from "./travel-status-wall";
import type { MemberWithRsvp } from "@/types";

type Mode = "overview" | "choose" | "driving" | "flight";

// Travel-proof entry point on the trip screen. Picks the path (flying/driving),
// runs it, shows the member's own verified summary, and the trip-wide status wall.
export function TravelProofCard({
  tripId,
  userId,
  isAdmin,
  members,
  onStepChange,
}: {
  tripId: string;
  userId: string;
  isAdmin: boolean;
  members: MemberWithRsvp[];
  onStepChange?: () => void;
}) {
  const proof = useTravelProof(tripId, userId);
  const status = useTravelStatus(tripId);
  const [mode, setMode] = useState<Mode>("overview");
  const [drivingSaving, setDrivingSaving] = useState(false);

  const verified = proof.proof?.verified ?? false;
  const myType = proof.proof?.type;

  async function handleDriving(note: string) {
    setDrivingSaving(true);
    const ok = await proof.confirmDriving(note);
    setDrivingSaving(false);
    if (ok) {
      status.refresh();
      onStepChange?.();
      setMode("overview");
    }
  }

  function afterFlightVerified() {
    // Refresh data but keep the flight view mounted so the animation plays; the
    // user taps "Done" to return.
    proof.refresh();
    status.refresh();
    onStepChange?.();
  }

  async function selfOverride(): Promise<boolean> {
    const ok = await status.override(userId);
    if (ok) await proof.refresh();
    return ok;
  }

  function backToOverview() {
    setMode("overview");
    proof.refresh();
    status.refresh();
  }

  if (proof.loading) {
    return (
      <Card>
        <View className="items-center py-4">
          <ActivityIndicator />
        </View>
      </Card>
    );
  }

  if (mode === "driving") {
    return (
      <Card>
        <DrivingConfirm
          onConfirm={handleDriving}
          onCancel={() => setMode("overview")}
          saving={drivingSaving}
          error={proof.error}
        />
      </Card>
    );
  }

  if (mode === "flight") {
    return (
      <Card>
        <FlightVerify
          tripId={tripId}
          userId={userId}
          isAdmin={isAdmin}
          onVerified={afterFlightVerified}
          onCancel={backToOverview}
          onSelfOverride={selfOverride}
        />
      </Card>
    );
  }

  const showChooser = !verified || mode === "choose";

  return (
    <View className="gap-3">
      {showChooser ? (
        <Card className="gap-3">
          <Text variant="heading">How are you getting there?</Text>
          <Text variant="muted">
            Confirm you&apos;re actually coming — the hard part of planning a
            trip.
          </Text>
          <View className="flex-row gap-2">
            <Button
              label="✈️ Flying"
              onPress={() => setMode("flight")}
              className="flex-1"
            />
            <Button
              label="🚗 Driving"
              variant="secondary"
              onPress={() => setMode("driving")}
              className="flex-1"
            />
          </View>
          {verified ? (
            <Pressable onPress={() => setMode("overview")}>
              <Text variant="muted" className="text-center">
                Keep my current confirmation
              </Text>
            </Pressable>
          ) : null}
        </Card>
      ) : (
        <Card className="gap-2">
          <Text variant="heading">
            {myType === "flight" ? "✈️ Flight verified" : "🚗 Driving confirmed"}
          </Text>
          <Text variant="muted">
            You&apos;re confirmed as coming.
            {myType === "flight" && proof.proof?.arrival_city
              ? ` Arriving in ${proof.proof.arrival_city}.`
              : ""}
            {myType === "driving" && proof.proof?.note
              ? ` ${proof.proof.note}`
              : ""}
          </Text>
          <Pressable onPress={() => setMode("choose")}>
            <Text className="text-primary">
              Change how you&apos;re getting there
            </Text>
          </Pressable>
        </Card>
      )}

      <View className="gap-2">
        <Text variant="heading">Who&apos;s actually coming</Text>
        {status.loading ? (
          <Card>
            <View className="items-center py-4">
              <ActivityIndicator />
            </View>
          </Card>
        ) : status.error ? (
          <Card>
            <Text className="text-destructive">{status.error}</Text>
          </Card>
        ) : (
          <TravelStatusWall
            members={members}
            statuses={status.statuses}
            isAdmin={isAdmin}
            onOverride={async (uid) => {
              const ok = await status.override(uid);
              if (uid === userId && ok) await proof.refresh();
              return ok;
            }}
          />
        )}
      </View>
    </View>
  );
}
