import { useEffect } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Countdown } from "./countdown";
import { ProgressBar } from "./progress-bar";
import { usePools } from "@/hooks/use-pools";
import { formatCents, fraction } from "@/lib/money";
import type { PoolType, Trip } from "@/types";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="items-center">
      <Text className="text-lg font-bold text-foreground">{value}</Text>
      <Text variant="muted" className="text-xs">
        {label}
      </Text>
    </View>
  );
}

// Lightweight group-readiness summary + a large live countdown. Seed of the
// Phase-2 "readiness meter" — deliberately not over-built.
export function ProgressPanel({
  trip,
  goingCount,
  verifiedCount,
  memberCount,
  version = 0,
}: {
  trip: Trip;
  goingCount: number;
  verifiedCount: number;
  memberCount: number;
  version?: number;
}) {
  const pools = usePools(trip.id, trip.airbnb_pick);
  const airbnbLocked = trip.status === "locked" && !!trip.airbnb_pick;

  // Refetch pool progress when a contribution is logged elsewhere on the screen.
  useEffect(() => {
    if (version > 0) pools.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  function poolProgress(type: PoolType) {
    const pool = pools.pools.find((p) => p.type === type);
    if (!pool || pool.total_cents == null) return null;
    const contributed = pools
      .contributionsFor(pool.id)
      .reduce((s, c) => s + c.amount_cents, 0);
    return { contributed, total: pool.total_cents };
  }

  const airbnbProg = poolProgress("airbnb");
  const carProg = trip.car_rental_ref ? poolProgress("car") : null;

  return (
    <Card className="gap-3">
      <View className="items-center gap-1">
        <Text variant="muted" className="text-xs uppercase tracking-widest">
          Countdown to the trip
        </Text>
        <Countdown target={trip.start_date} />
      </View>

      <View className="flex-row justify-around pt-1">
        <Stat label="Going" value={goingCount} />
        <Stat label="Verified" value={`${verifiedCount}/${memberCount}`} />
        <Stat label="Airbnb" value={airbnbLocked ? "Locked ✓" : "Open"} />
      </View>

      {airbnbProg ? (
        <View className="gap-1">
          <View className="flex-row justify-between">
            <Text variant="muted" className="text-xs">
              Airbnb pool
            </Text>
            <Text variant="muted" className="text-xs">
              {formatCents(airbnbProg.contributed)} / {formatCents(airbnbProg.total)}
            </Text>
          </View>
          <ProgressBar fraction={fraction(airbnbProg.contributed, airbnbProg.total)} />
        </View>
      ) : null}

      {carProg ? (
        <View className="gap-1">
          <View className="flex-row justify-between">
            <Text variant="muted" className="text-xs">
              Car pool
            </Text>
            <Text variant="muted" className="text-xs">
              {formatCents(carProg.contributed)} / {formatCents(carProg.total)}
            </Text>
          </View>
          <ProgressBar fraction={fraction(carProg.contributed, carProg.total)} />
        </View>
      ) : null}
    </Card>
  );
}
