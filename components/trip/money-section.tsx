import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { PoolCard } from "./pool-card";
import { usePools } from "@/hooks/use-pools";
import type { MemberWithRsvp, Trip } from "@/types";

// The Money card: a ledger-mode banner + the two pools (Airbnb always; car only
// if the trip has a car rental). LEDGER ONLY — no funds move (D3).
export function MoneySection({
  trip,
  userId,
  isAdmin,
  members,
  onChanged,
}: {
  trip: Trip;
  userId: string;
  isAdmin: boolean;
  members: MemberWithRsvp[];
  onChanged: () => void;
}) {
  const pools = usePools(trip.id, trip.airbnb_pick);
  const goingMembers = members.filter((m) => m.status === "going");
  const hasCar = !!trip.car_rental_ref;

  const airbnbPool = pools.pools.find((p) => p.type === "airbnb") ?? null;
  const carPool = pools.pools.find((p) => p.type === "car") ?? null;

  function handleChanged() {
    pools.refresh();
    onChanged();
  }

  return (
    <View className="gap-3">
      {/* Ledger-mode banner — no real payment processing (Stripe Connect is the
          gated later phase, D3). */}
      <Card className="gap-1">
        <Text className="font-semibold">💸 Ledger mode</Text>
        <Text variant="muted" className="text-xs">
          No real payment processing — logging a contribution just records the
          amount. Real transfers (Stripe Connect) are the gated later phase.
        </Text>
      </Card>

      {pools.loading ? (
        <Card>
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        </Card>
      ) : pools.error ? (
        <Card>
          <Text className="text-destructive">{pools.error}</Text>
        </Card>
      ) : (
        <>
          <PoolCard
            type="airbnb"
            pool={airbnbPool}
            tripId={trip.id}
            userId={userId}
            isAdmin={isAdmin}
            goingMembers={goingMembers}
            contributions={airbnbPool ? pools.contributionsFor(airbnbPool.id) : []}
            suggestedCents={pools.suggestedAirbnbCents}
            defaultUnlockDate={trip.start_date}
            onSetTotal={pools.setPoolTotal}
            onChanged={handleChanged}
          />
          {hasCar ? (
            <PoolCard
              type="car"
              pool={carPool}
              tripId={trip.id}
              userId={userId}
              isAdmin={isAdmin}
              goingMembers={goingMembers}
              contributions={carPool ? pools.contributionsFor(carPool.id) : []}
              defaultUnlockDate={trip.start_date}
              carRef={trip.car_rental_ref}
              onSetTotal={pools.setPoolTotal}
              onChanged={handleChanged}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
