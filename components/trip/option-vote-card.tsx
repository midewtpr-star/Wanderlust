import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { formatCents } from "@/lib/money";
import type { AirbnbOption, MemberWithRsvp } from "@/types";

// One Airbnb option in the voting list: listing details, a link, this member's
// vote toggle, the live tally + voter avatars, and (for admins, while unlocked)
// a "Lock this pick" action.
export function OptionVoteCard({
  option,
  voted,
  voters,
  isAdmin,
  locked,
  official,
  voteSaving,
  lockSaving,
  onVote,
  onLock,
}: {
  option: AirbnbOption;
  voted: boolean;
  voters: MemberWithRsvp[];
  isAdmin: boolean;
  locked: boolean;
  official: boolean;
  voteSaving: boolean;
  lockSaving: boolean;
  onVote: () => void;
  onLock: () => void;
}) {
  const costCents =
    option.total_cost != null ? Math.round(option.total_cost * 100) : null;

  async function openListing() {
    if (option.url) await WebBrowser.openBrowserAsync(option.url);
  }

  return (
    <Card className={official ? "gap-3 border-green-500" : "gap-3"}>
      {option.image_url ? (
        <Image
          source={{ uri: option.image_url }}
          style={{ width: "100%", height: 150, borderRadius: 10 }}
          contentFit="cover"
        />
      ) : null}

      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="font-semibold" numberOfLines={2}>
            {option.title || "Airbnb option"}
          </Text>
          {costCents != null ? (
            <Text variant="muted">{formatCents(costCents)} total</Text>
          ) : null}
        </View>
        {official ? (
          <View className="rounded-full bg-green-100 px-2 py-0.5">
            <Text className="text-xs font-semibold text-green-700">Official</Text>
          </View>
        ) : null}
      </View>

      {option.notes ? (
        <Text variant="muted" numberOfLines={3}>
          {option.notes}
        </Text>
      ) : null}

      {option.url ? (
        <Pressable onPress={openListing}>
          <Text className="text-primary">Open listing ↗</Text>
        </Pressable>
      ) : null}

      {/* Tally + voters */}
      <View className="flex-row items-center justify-between">
        <Text variant="muted" className="text-xs">
          {voters.length} vote{voters.length === 1 ? "" : "s"}
        </Text>
        <View className="flex-row">
          {voters.slice(0, 6).map((v, i) => (
            <View key={v.user_id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
              <Avatar name={v.display_name} uri={v.avatar_url} size={26} />
            </View>
          ))}
          {voters.length > 6 ? (
            <Text variant="muted" className="ml-1 text-xs">
              +{voters.length - 6}
            </Text>
          ) : null}
        </View>
      </View>

      {!locked ? (
        <View className="gap-2">
          <Button
            label={voted ? "✓ Your vote" : "Vote for this"}
            variant={voted ? "secondary" : "default"}
            disabled={voteSaving}
            onPress={onVote}
          />
          {isAdmin ? (
            <Button
              label={lockSaving ? "Locking…" : "Lock this pick"}
              variant="outline"
              disabled={lockSaving}
              onPress={onLock}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
