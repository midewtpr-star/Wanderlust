import { useCallback, useMemo, useState, type ReactNode } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JournalEntryCard } from "@/components/journal/entry-card";
import { JournalComposer } from "@/components/journal/journal-composer";
import { useAuth } from "@/lib/auth-provider";
import { TripThemeProvider } from "@/lib/trip-theme";
import { useTrip } from "@/hooks/use-trip";
import { useActivities } from "@/hooks/use-activities";
import { useJournal, type JournalUpload } from "@/hooks/use-journal";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";
import type { JournalEntryInput } from "@/types";

const ALL = "__all__";
const NONE = "__none__";

export default function JournalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  const { trip, loading: tripLoading, notAuthorized } = useTrip(id);
  const { activities } = useActivities(id, userId);
  const { entries, loading, error, progress, create, refresh } = useJournal(id, userId);

  const [dayFilter, setDayFilter] = useState<string>(ALL); // ALL | NONE | <isodate>
  const [activityFilter, setActivityFilter] = useState<string>(ALL); // ALL | <activityId>
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Reload when refocusing (e.g. after editing/deleting on the detail screen).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const activityTitle = useMemo(() => {
    const map = new Map(activities.map((a) => [a.id, a.title]));
    return (activityId: string | null) => (activityId ? map.get(activityId) ?? null : null);
  }, [activities]);

  // Content-driven filter options (only show what entries actually use).
  const dayOptions = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.day && set.add(e.day));
    return [...set].sort();
  }, [entries]);
  const hasNoDay = useMemo(() => entries.some((e) => !e.day), [entries]);
  const activityOptions = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.activity_id && set.add(e.activity_id));
    return [...set];
  }, [entries]);

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        const dayOk =
          dayFilter === ALL ? true : dayFilter === NONE ? !e.day : e.day === dayFilter;
        const actOk = activityFilter === ALL ? true : e.activity_id === activityFilter;
        return dayOk && actOk;
      }),
    [entries, dayFilter, activityFilter],
  );

  async function onCreate(input: JournalEntryInput, uploads: JournalUpload[]) {
    setSaving(true);
    setNote(null);
    const res = await create(input, uploads);
    setSaving(false);
    if (res) {
      setComposerOpen(false);
      if (res.skipped.length) {
        setNote(`Entry saved. Skipped ${res.skipped.length}: ${res.skipped.join(", ")}.`);
      }
    }
  }

  const headerTitle = trip?.title ? `${trip.title} · Journal` : "Journal";
  const showFilters = entries.length > 0 && (dayOptions.length > 0 || activityOptions.length > 0);

  return (
    <TripThemeProvider tripId={id}>
      <Stack.Screen options={{ title: headerTitle }} />
      <View className="flex-1 bg-background">
        {tripLoading || loading ? (
          <ListSkeleton />
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
            <View className="flex-row items-center justify-between gap-3 px-5 pb-1 pt-3">
              <Text variant="heading">Trip journal</Text>
              <Button label="New entry" size="sm" onPress={() => setComposerOpen(true)} />
            </View>

            {showFilters ? (
              <View className="gap-1 px-4 pb-2">
                <FilterRow label="Day">
                  <Chip label="All" active={dayFilter === ALL} onPress={() => setDayFilter(ALL)} />
                  {dayOptions.map((d) => (
                    <Chip
                      key={d}
                      label={formatDate(d)}
                      active={dayFilter === d}
                      onPress={() => setDayFilter(d)}
                    />
                  ))}
                  {hasNoDay ? (
                    <Chip
                      label="No day"
                      active={dayFilter === NONE}
                      onPress={() => setDayFilter(NONE)}
                    />
                  ) : null}
                </FilterRow>
                {activityOptions.length ? (
                  <FilterRow label="Activity">
                    <Chip
                      label="All"
                      active={activityFilter === ALL}
                      onPress={() => setActivityFilter(ALL)}
                    />
                    {activityOptions.map((a) => (
                      <Chip
                        key={a}
                        label={activityTitle(a) ?? "Activity"}
                        active={activityFilter === a}
                        onPress={() => setActivityFilter(a)}
                      />
                    ))}
                  </FilterRow>
                ) : null}
              </View>
            ) : null}

            {error ? (
              <View className="px-4 pt-2">
                <Text className="text-destructive">{error}</Text>
              </View>
            ) : null}
            {note ? (
              <View className="px-4 pt-2">
                <Text variant="muted" className="text-xs">
                  {note}
                </Text>
              </View>
            ) : null}

            {entries.length === 0 ? (
              <Centered>
                <Text variant="heading" className="text-center">
                  No entries yet
                </Text>
                <Text variant="muted" className="text-center">
                  Capture the trip as it happens — write what you did, drop in photos and videos.
                </Text>
                <Button label="Write the first entry" onPress={() => setComposerOpen(true)} />
              </Centered>
            ) : filtered.length === 0 ? (
              <Centered>
                <Text variant="muted" className="text-center">
                  No entries match this filter.
                </Text>
                <Button
                  label="Clear filters"
                  variant="outline"
                  onPress={() => {
                    setDayFilter(ALL);
                    setActivityFilter(ALL);
                  }}
                />
              </Centered>
            ) : (
              <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}
              >
                {filtered.map((e) => (
                  <JournalEntryCard
                    key={e.id}
                    entry={e}
                    activityTitle={activityTitle(e.activity_id)}
                    onPress={() => router.push(`/journal-entry/${e.id}`)}
                  />
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>

      <JournalComposer
        visible={composerOpen}
        mode="create"
        startDate={trip?.start_date ?? null}
        endDate={trip?.end_date ?? null}
        activities={activities}
        saving={saving}
        progress={progress}
        onClose={() => setComposerOpen(false)}
        onSubmit={onCreate}
      />
    </TripThemeProvider>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text variant="caption" className="w-14">
        {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1 flex-1">
        <View className="flex-row gap-2 px-1 py-0.5">{children}</View>
      </ScrollView>
    </View>
  );
}

function Chip({
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
        "rounded-full border px-3 py-1 active:opacity-80",
        active ? "border-primary bg-accent-fill" : "border-border bg-secondary",
      )}
    >
      <Text
        className={cn("text-sm", active ? "text-primary-foreground" : "text-foreground")}
        style={{ fontFamily: fontFamily("medium") }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-3 p-8">{children}</View>;
}

function ListSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2].map((i) => (
        <View key={i} className="gap-2">
          <Skeleton height={120} radius={16} />
        </View>
      ))}
    </View>
  );
}
