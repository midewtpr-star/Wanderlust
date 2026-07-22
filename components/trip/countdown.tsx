import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { countdownTo } from "@/lib/dates";

// Live countdown to a start date. `compact` renders a short "in 12d" label for cards.
export function Countdown({
  target,
  compact = false,
}: {
  target: string | null | undefined;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const c = countdownTo(target, now);
  if (!c) return <Text variant="muted">Dates TBD</Text>;
  if (c.done)
    return <Text variant="muted">{compact ? "Now" : "The trip is here 🎉"}</Text>;

  if (compact) {
    const label =
      c.days > 0 ? `in ${c.days}d` : c.hours > 0 ? `in ${c.hours}h` : `in ${c.minutes}m`;
    return <Text variant="muted">{label}</Text>;
  }

  const units: [string, number][] = [
    ["d", c.days],
    ["h", c.hours],
    ["m", c.minutes],
    ["s", c.seconds],
  ];
  return (
    <View className="flex-row gap-3">
      {units.map(([u, n]) => (
        <View key={u} className="items-center">
          <Text className="text-xl font-bold text-foreground">
            {String(n).padStart(2, "0")}
          </Text>
          <Text variant="muted" className="text-xs">
            {u}
          </Text>
        </View>
      ))}
    </View>
  );
}
