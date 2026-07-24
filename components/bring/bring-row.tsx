import { memo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { fontFamily } from "@/constants/theme";
import type { Claimer, BringItemView } from "@/hooks/use-bring-list";

function claimersLabel(claims: Claimer[], meId: string | undefined): string {
  const names = claims
    .map((c) => (c.user_id === meId ? "You" : c.name ?? "Someone"))
    .sort((a) => (a === "You" ? -1 : 0)); // put "You" first
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function PriorityChip({ needed }: { needed: boolean }) {
  if (needed) {
    // Needed = accent-driven emphasis (never invisible via border-primary).
    return (
      <View className="rounded-full border border-primary bg-accent-fill px-2 py-0.5">
        <Text
          className="text-[11px] text-primary-foreground"
          style={{ fontFamily: fontFamily("semibold") }}
        >
          Needed
        </Text>
      </View>
    );
  }
  return (
    <View className="rounded-full bg-secondary px-2 py-0.5">
      <Text className="text-[11px] text-muted-foreground">Optional</Text>
    </View>
  );
}

function BringRowBase({
  item,
  meId,
  canEdit,
  claiming,
  onClaim,
  onUnclaim,
  onEdit,
}: {
  item: BringItemView;
  meId: string | undefined;
  canEdit: boolean;
  claiming: boolean;
  onClaim: () => void;
  onUnclaim: () => void;
  onEdit: () => void;
}) {
  const needed = item.priority === "needed";
  return (
    <Card className="gap-2">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text variant="heading" numberOfLines={2} className="flex-shrink">
              {item.name}
            </Text>
            {item.quantity ? <Text variant="caption">×{item.quantity}</Text> : null}
          </View>

          <View className="flex-row items-center gap-2">
            <PriorityChip needed={needed} />
            {item.category ? (
              <Text variant="caption">· {item.category}</Text>
            ) : null}
          </View>

          {item.notes ? (
            <Text variant="muted" numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}

          {item.claims.length ? (
            <View className="mt-0.5 flex-row items-center gap-1.5">
              <View className="flex-row">
                {item.claims.slice(0, 4).map((c, i) => (
                  <View key={c.user_id} style={{ marginLeft: i === 0 ? 0 : -6 }}>
                    <Avatar name={c.name} uri={c.avatar} size={20} />
                  </View>
                ))}
              </View>
              <Text variant="caption" numberOfLines={1} className="flex-1">
                {claimersLabel(item.claims, meId)}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="items-end gap-1.5">
          {item.claimedByMe ? (
            <Pressable
              onPress={onUnclaim}
              disabled={claiming}
              accessibilityRole="button"
              accessibilityLabel="You're bringing this — tap to unclaim"
              className="rounded-lg border border-border px-3 py-1.5 active:opacity-80"
            >
              <Text className="text-xs" style={{ fontFamily: fontFamily("semibold") }}>
                Bringing ✓
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onClaim}
              disabled={claiming}
              accessibilityRole="button"
              accessibilityLabel="I'll bring it"
              className="rounded-lg border border-primary bg-accent-fill px-3 py-1.5 active:opacity-80"
            >
              <Text
                className="text-xs text-primary-foreground"
                style={{ fontFamily: fontFamily("semibold") }}
              >
                {item.claimed ? "Also bring" : "I'll bring it"}
              </Text>
            </Pressable>
          )}
          {canEdit ? (
            <Pressable
              onPress={onEdit}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Edit item"
              className="px-1 active:opacity-70"
            >
              <Text variant="caption">Edit</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export const BringRow = memo(BringRowBase);
