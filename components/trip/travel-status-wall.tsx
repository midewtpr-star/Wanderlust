import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import type { MemberWithRsvp, TravelStatusRow } from "@/types";

// Per-member travel status: ✈️ flight-verified / 🚗 driving-confirmed / pending.
// Non-PII (from get_travel_status). Admins get an inline manual-override button
// for anyone still pending.
export function TravelStatusWall({
  members,
  statuses,
  isAdmin,
  onOverride,
}: {
  members: MemberWithRsvp[];
  statuses: Map<string, TravelStatusRow>;
  isAdmin: boolean;
  onOverride: (userId: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function handleOverride(userId: string) {
    setBusy(userId);
    await onOverride(userId);
    setBusy(null);
  }

  return (
    <Card className="gap-3">
      {members.map((m) => {
        const s = statuses.get(m.user_id);
        const verified = s?.verified ?? false;
        const icon = verified ? (s?.type === "flight" ? "✈️" : "🚗") : "⏳";
        const label = verified
          ? s?.type === "flight"
            ? "Flight verified"
            : "Driving confirmed"
          : "Pending";
        return (
          <View key={m.user_id} className="flex-row items-center gap-3">
            <Avatar name={m.display_name} uri={m.avatar_url} />
            <View className="flex-1">
              <Text numberOfLines={1}>
                {m.display_name ?? "Member"}
                {m.role === "host" ? " · host" : ""}
              </Text>
              <Text variant="muted" className="text-xs">
                {icon} {label}
              </Text>
            </View>
            {isAdmin && !verified ? (
              <Button
                label={busy === m.user_id ? "…" : "Verify"}
                size="sm"
                variant="outline"
                onPress={() => handleOverride(m.user_id)}
                disabled={busy !== null}
              />
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}
