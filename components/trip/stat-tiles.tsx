import { View } from "react-native";
import { Text } from "@/components/ui/text";
import type { TripStats } from "@/types";

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <View
      style={{ width: "31.5%" }}
      className="mb-2 items-center rounded-xl bg-muted p-3"
    >
      <Text className="text-2xl font-bold text-foreground">{value}</Text>
      <Text variant="muted" className="text-center text-xs">
        {label}
      </Text>
      {sub ? (
        <Text variant="muted" className="mt-0.5 text-center text-[10px]">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

// Strava-style stat tiles — real numbers only.
export function StatTiles({ stats }: { stats: TripStats }) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
      }}
    >
      <Tile label="Places" value={stats.places_visited} />
      <Tile
        label="Miles"
        value={stats.miles_covered}
        sub={`${stats.miles_tracked_members} of ${stats.member_count} tracked`}
      />
      <Tile
        label="Verified"
        value={`${stats.verified_members}/${stats.member_count}`}
        sub={`${stats.steps_completed} steps done`}
      />
      <Tile label="Days" value={stats.trip_days} />
      <Tile label="Photos & video" value={stats.total_media} />
      <Tile label="Confirmed" value={stats.confirmed_travelers} />
    </View>
  );
}
