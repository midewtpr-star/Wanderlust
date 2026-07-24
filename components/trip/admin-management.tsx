import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { useTripAdmins } from "@/hooks/use-trip-admins";
import type { MemberWithRsvp } from "@/types";

const MAX_ADMINS = 3; // D8 — host counts toward the 3 (enforced by DB trigger).

// Host-only: promote members to admin / demote them, capped at 3 admins (D8).
// The DB trigger is the real guard; this surfaces the limit clearly.
export function AdminManagement({
  members,
  tripId,
  onChange,
}: {
  members: MemberWithRsvp[];
  tripId: string;
  onChange: () => void;
}) {
  const { promote, demote, saving, error } = useTripAdmins(tripId);

  const adminCount = members.filter(
    (m) => m.role === "host" || m.role === "admin",
  ).length;
  const atLimit = adminCount >= MAX_ADMINS;

  async function onPromote(userId: string) {
    if (await promote(userId)) onChange();
  }
  async function onDemote(userId: string) {
    if (await demote(userId)) onChange();
  }

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">Manage admins</Text>
        <Text variant="muted" className="text-xs">
          {adminCount}/{MAX_ADMINS} admins
        </Text>
      </View>

      {members.map((m) => {
        const isHost = m.role === "host";
        const isAdmin = m.role === "admin";
        return (
          <View key={m.user_id} className="flex-row items-center gap-3">
            <Avatar name={m.display_name} uri={m.avatar_url} size={32} />
            <View className="flex-1">
              <Text numberOfLines={1}>{m.display_name ?? "Member"}</Text>
              {isHost || isAdmin ? (
                <Text variant="muted" className="text-xs">
                  {isHost ? "👑 Host" : "🛡️ Admin"}
                </Text>
              ) : null}
            </View>
            {isHost ? null : isAdmin ? (
              <Button
                label={saving === m.user_id ? "…" : "Demote"}
                size="sm"
                variant="outline"
                disabled={saving !== null}
                onPress={() => onDemote(m.user_id)}
              />
            ) : (
              <Button
                label={saving === m.user_id ? "…" : "Make admin"}
                size="sm"
                variant="secondary"
                disabled={saving !== null || atLimit}
                onPress={() => onPromote(m.user_id)}
              />
            )}
          </View>
        );
      })}

      {atLimit ? (
        <Text variant="muted" className="text-xs">
          Admin limit reached — demote someone to add another (max {MAX_ADMINS}).
        </Text>
      ) : null}
      {error ? <Text className="text-destructive">{error}</Text> : null}
    </Card>
  );
}
