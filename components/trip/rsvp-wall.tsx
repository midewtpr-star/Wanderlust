import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { VerifiedBadge, StepProgress } from "./verified-badge";
import type { MemberWithRsvp } from "@/types";
import type { MemberVerification } from "@/hooks/use-member-verification";

function Group({
  title,
  members,
  prominent,
  statusFor,
}: {
  title: string;
  members: MemberWithRsvp[];
  prominent?: boolean;
  statusFor?: (userId: string) => MemberVerification;
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
          {members.map((m) => {
            const status = statusFor?.(m.user_id);
            return (
              <View key={m.user_id} className="flex-row items-center gap-3">
                <Avatar name={m.display_name} uri={m.avatar_url} />
                <Text numberOfLines={1} className="flex-1">
                  {m.display_name ?? "Member"}
                  {m.role === "host"
                    ? " · host"
                    : m.role === "admin"
                      ? " · admin"
                      : ""}
                </Text>
                {status ? (
                  status.verified ? (
                    <VerifiedBadge />
                  ) : (
                    <StepProgress
                      completed={status.completed}
                      required={status.required}
                    />
                  )
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function RsvpWall({
  groups,
  statusFor,
}: {
  groups: {
    going: MemberWithRsvp[];
    maybe: MemberWithRsvp[];
    not: MemberWithRsvp[];
    invited: MemberWithRsvp[];
  };
  statusFor?: (userId: string) => MemberVerification;
}) {
  return (
    <Card className="gap-4">
      <Group title="Going" members={groups.going} prominent statusFor={statusFor} />
      <Group title="Maybe" members={groups.maybe} statusFor={statusFor} />
      <Group title="Can't go" members={groups.not} statusFor={statusFor} />
      {groups.invited.length > 0 ? (
        <Group title="Invited · no reply" members={groups.invited} statusFor={statusFor} />
      ) : null}
    </Card>
  );
}
