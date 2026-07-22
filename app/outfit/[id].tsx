import { useCallback, useState, type ReactNode } from "react";
import { View, ScrollView, Platform, Alert } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { ReactionButton } from "@/components/outfits/reaction-button";
import { ItemCard } from "@/components/outfits/item-card";
import { AddItemModal } from "@/components/outfits/add-item-modal";
import { useAuth } from "@/lib/auth-provider";
import { useOutfit, useOutfitReaction } from "@/hooks/use-outfits";
import { useOutfitItems, type OutfitItemWithUrl } from "@/hooks/use-outfit-items";
import { formatDate } from "@/lib/dates";

export default function OutfitMoodboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  const { outfit, loading, notFound } = useOutfit(id);
  const tripId = outfit?.trip_id;
  const { items, loading: itemsLoading, busy, addLink, addUpload, remove, move } =
    useOutfitItems(id, tripId, userId);
  const reaction = useOutfitReaction(id, tripId, userId);

  const [addOpen, setAddOpen] = useState(false);
  const editable = !!outfit && outfit.owner_id === userId;

  const confirmRemove = useCallback(
    (item: OutfitItemWithUrl) => {
      const doIt = () => remove(item);
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.confirm("Remove this item?")) doIt();
      } else {
        Alert.alert("Remove item", "Remove this from the moodboard?", [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: doIt },
        ]);
      }
    },
    [remove],
  );

  const headerTitle = outfit?.title ?? "Outfit";

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <View className="flex-1 bg-background">
        {loading ? (
          <View className="gap-4 p-5">
            <Skeleton height={70} radius={16} />
            <View className="flex-row flex-wrap gap-3">
              {[0, 1, 2, 3].map((i) => (
                <View key={i} className="w-[47%] grow">
                  <Skeleton height={150} radius={12} />
                </View>
              ))}
            </View>
          </View>
        ) : notFound || !outfit ? (
          <Centered>
            <Text variant="heading">Not available</Text>
            <Text variant="muted" className="text-center">
              This outfit doesn&apos;t exist or you&apos;re not on the trip.
            </Text>
            <Button label="Back" variant="outline" onPress={() => router.back()} />
          </Centered>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
            {/* header card */}
            <Card className="mb-4 gap-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-2 pr-2">
                  <Avatar name={outfit.owner_name} uri={outfit.owner_avatar} size={28} />
                  <Text variant="muted" numberOfLines={1} className="flex-1">
                    {outfit.owner_name ?? "Member"}
                    {outfit.day ? ` · ${formatDate(outfit.day)}` : " · Any day"}
                  </Text>
                </View>
                <ReactionButton
                  loved={reaction.loved}
                  count={reaction.count}
                  onToggle={reaction.toggle}
                />
              </View>
              {outfit.notes ? <Text>{outfit.notes}</Text> : null}
            </Card>

            {editable ? (
              <Button
                label="Add item"
                className="mb-4"
                onPress={() => setAddOpen(true)}
              />
            ) : null}

            {itemsLoading ? (
              <View className="flex-row flex-wrap gap-3">
                {[0, 1].map((i) => (
                  <View key={i} className="w-[47%] grow">
                    <Skeleton height={150} radius={12} />
                  </View>
                ))}
              </View>
            ) : items.length === 0 ? (
              <Centered>
                <Text variant="heading" className="text-center">
                  No items yet
                </Text>
                <Text variant="muted" className="text-center">
                  {editable
                    ? "Add a Pinterest pin, any link, or a photo to build the look."
                    : "This moodboard is empty for now."}
                </Text>
                {editable ? (
                  <Button label="Add item" onPress={() => setAddOpen(true)} />
                ) : null}
              </Centered>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {items.map((it, i) => (
                  <View key={it.id} className="w-[47%] grow">
                    <ItemCard
                      item={it}
                      editable={editable}
                      canMoveLeft={i > 0}
                      canMoveRight={i < items.length - 1}
                      onMoveLeft={() => move(it.id, "left")}
                      onMoveRight={() => move(it.id, "right")}
                      onDelete={() => confirmRemove(it)}
                    />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <AddItemModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAddLink={addLink}
        onAddUpload={addUpload}
        busy={busy}
      />
    </>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-8">{children}</View>
  );
}
