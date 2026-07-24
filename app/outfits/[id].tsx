import { useCallback, useMemo, useState, type ReactNode } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { OutfitCard } from "@/components/outfits/outfit-card";
import { CreateOutfitModal } from "@/components/outfits/create-outfit-modal";
import { useAuth } from "@/lib/auth-provider";
import { TripThemeProvider } from "@/lib/trip-theme";
import { useTrip } from "@/hooks/use-trip";
import { useActivities } from "@/hooks/use-activities";
import { useOutfits, type OutfitCard as OutfitCardData } from "@/hooks/use-outfits";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";
import type { OutfitInput } from "@/types";

type Grouping = "day" | "person";
type Group = {
  key: string;
  label: string;
  avatar?: string | null;
  outfits: OutfitCardData[];
};

function push<T>(map: Map<string, T[]>, key: string, val: T) {
  const arr = map.get(key);
  if (arr) arr.push(val);
  else map.set(key, [val]);
}

function groupByDay(outfits: OutfitCardData[]): Group[] {
  const map = new Map<string, OutfitCardData[]>();
  outfits.forEach((o) => push(map, o.day ?? "__any__", o));
  const keys = [...map.keys()].sort((a, b) => {
    if (a === "__any__") return 1;
    if (b === "__any__") return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return keys.map((k) => ({
    key: k,
    label: k === "__any__" ? "Any day" : formatDate(k),
    outfits: map.get(k)!,
  }));
}

function groupByPerson(outfits: OutfitCardData[]): Group[] {
  const map = new Map<string, OutfitCardData[]>();
  outfits.forEach((o) => push(map, o.owner_id, o));
  return [...map.entries()].map(([owner, list]) => ({
    key: owner,
    label: list[0].owner_name ?? "Member",
    avatar: list[0].owner_avatar,
    outfits: list,
  }));
}

export default function OutfitBoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  const { trip, loading: tripLoading, notAuthorized } = useTrip(id);
  const { outfits, loading, create, toggleLove, refresh } = useOutfits(id, userId);
  const { activities } = useActivities(id, userId);

  const [grouping, setGrouping] = useState<Grouping>("day");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reload when refocusing (e.g. returning from a moodboard where items/loves changed).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const groups = useMemo(
    () => (grouping === "day" ? groupByDay(outfits) : groupByPerson(outfits)),
    [grouping, outfits],
  );

  async function onCreate(input: OutfitInput) {
    setSaving(true);
    const created = await create(input);
    setSaving(false);
    setCreateOpen(false);
    if (created) router.push(`/outfit/${created.id}`); // straight into the moodboard
  }

  const headerTitle = trip?.title ? `${trip.title} · Outfits` : "Outfits";

  return (
    <TripThemeProvider tripId={id}>
      <Stack.Screen options={{ title: headerTitle }} />
      <View className="flex-1 bg-background">
        {tripLoading || loading ? (
          <BoardSkeleton />
        ) : notAuthorized ? (
          <Centered>
            <Text variant="heading">Not available</Text>
            <Text variant="muted" className="text-center">
              This trip doesn&apos;t exist or you&apos;re not a member.
            </Text>
            <Button label="Back to Trips" variant="outline" onPress={() => router.replace("/")} />
          </Centered>
        ) : (
          <>
            {/* toolbar */}
            <View className="flex-row items-center justify-between gap-3 px-5 pb-2 pt-3">
              <View className="flex-row rounded-xl border border-border p-1">
                <Seg label="By day" active={grouping === "day"} onPress={() => setGrouping("day")} />
                <Seg label="By person" active={grouping === "person"} onPress={() => setGrouping("person")} />
              </View>
              <Button label="New" size="sm" onPress={() => setCreateOpen(true)} />
            </View>

            {outfits.length === 0 ? (
              <Centered>
                <Text variant="heading" className="text-center">
                  Plan your fits
                </Text>
                <Text variant="muted" className="text-center">
                  Paste a Pinterest link to start — or upload a photo of your look.
                </Text>
                <Button label="New outfit" onPress={() => setCreateOpen(true)} />
              </Centered>
            ) : (
              <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
              >
                {groups.map((g) => (
                  <View key={g.key} className="mb-6">
                    <View className="mb-3 flex-row items-center gap-2">
                      {grouping === "person" ? (
                        <Avatar name={g.label} uri={g.avatar} size={24} />
                      ) : null}
                      <Text variant="heading">{g.label}</Text>
                      <Text variant="caption">· {g.outfits.length}</Text>
                    </View>
                    <View className="flex-row flex-wrap gap-3">
                      {g.outfits.map((o) => (
                        <View key={o.id} className="w-[47%] grow">
                          <OutfitCard
                            outfit={o}
                            onPress={() => router.push(`/outfit/${o.id}`)}
                            onToggleLove={() => toggleLove(o.id)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>

      <CreateOutfitModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreate}
        startDate={trip?.start_date ?? null}
        endDate={trip?.end_date ?? null}
        activities={activities}
        saving={saving}
      />
    </TripThemeProvider>
  );
}

function Seg({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={cn(
        "rounded-lg px-3 py-1.5 active:opacity-80",
        active ? "border border-primary bg-accent-fill" : "",
      )}
    >
      <Text
        className={cn("text-sm", active ? "text-primary-foreground" : "text-muted-foreground")}
        style={{ fontFamily: fontFamily("semibold") }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-8">{children}</View>
  );
}

function BoardSkeleton() {
  return (
    <View className="flex-row flex-wrap gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="w-[47%] grow gap-2">
          <Skeleton height={150} radius={16} />
          <Skeleton height={14} width="70%" />
          <Skeleton height={12} width="45%" />
        </View>
      ))}
    </View>
  );
}
