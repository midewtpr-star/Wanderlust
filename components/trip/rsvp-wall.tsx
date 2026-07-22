import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import type { MemberWithRsvp } from "@/types";

function Group({
  title,
  members,
  prominent,
}: {
  title: string;
  members: MemberWithRsvp[];
  prominent?: boolean;
}) {
  return (
    <View className="gap-2">
      <Text
        className={
          prominent
            ? "text-base font-bold text-foreground"
            : "text-sm font-semibold text-muted-foreground"
        }
      >
        {title} ({members.length})
      </Text>
      {members.length === 0 ? (
        <Text variant="muted" className="text-xs">
          No one yet.
        </Text>
      ) : (
        <View className="gap-2">
          {members.map((m) => (
            <View key={m.user_id} className="flex-row items-center gap-3">
              <Avatar name={m.display_name} uri={m.avatar_url} />
              <Text numberOfLines={1}>
                {m.display_name ?? "Member"}
                {m.role === "host" ? " · host" : ""}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function RsvpWall({
  groups,
}: {
  groups: {
    going: MemberWithRsvp[];
    maybe: MemberWithRsvp[];
    not: MemberWithRsvp[];
    invited: MemberWithRsvp[];
  };
}) {
  return (
    <Card className="gap-4">
      <Group title="Going" members={groups.going} prominent />
      <Group title="Maybe" members={groups.maybe} />
      <Group title="Can't go" members={groups.not} />
      {groups.invited.length > 0 ? (
        <Group title="Invited · no reply" members={groups.invited} />
      ) : null}
    </Card>
  );
}
