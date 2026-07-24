import { useMemo, useState, type ReactNode } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { VideoItem } from "@/components/trip/video-item";
import { JournalComposer } from "@/components/journal/journal-composer";
import { useAuth } from "@/lib/auth-provider";
import { TripThemeProvider } from "@/lib/trip-theme";
import { useActivities } from "@/hooks/use-activities";
import { useTrip } from "@/hooks/use-trip";
import { useJournalEntry, type JournalUpload } from "@/hooks/use-journal";
import { formatDate, formatDayLabel } from "@/lib/dates";
import type { JournalEntryInput } from "@/types";

export default function JournalEntryScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  const { entry, loading, notFound, error, progress, update, addMedia, removeMedia, remove } =
    useJournalEntry(entryId, userId);
  const { activities } = useActivities(entry?.trip_id, userId);
  const { trip } = useTrip(entry?.trip_id);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const isAuthor = !!entry && !!userId && entry.author_id === userId;

  const activityId = entry?.activity_id ?? null;
  const activityTitle = useMemo(() => {
    if (!activityId) return null;
    return activities.find((a) => a.id === activityId)?.title ?? null;
  }, [activities, activityId]);

  async function onEdit(input: JournalEntryInput, uploads: JournalUpload[]) {
    setSaving(true);
    setNote(null);
    const ok = await update(input);
    let skipped: string[] = [];
    if (ok && uploads.length) skipped = await addMedia(uploads);
    setSaving(false);
    if (ok) {
      setEditOpen(false);
      if (skipped.length) setNote(`Saved. Skipped ${skipped.length}: ${skipped.join(", ")}.`);
    }
  }

  async function onDelete() {
    const ok = await remove();
    if (ok) router.back();
  }

  return (
    <TripThemeProvider tripId={entry?.trip_id ?? undefined}>
      <Stack.Screen options={{ title: "Journal entry" }} />
      {loading ? (
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator />
        </View>
      ) : notFound || !entry ? (
        <Centered>
          <Text variant="heading">Not available</Text>
          <Text variant="muted" className="text-center">
            This entry doesn&apos;t exist or you&apos;re not a member of its trip.
          </Text>
          <Button label="Back" variant="outline" onPress={() => router.back()} />
        </Centered>
      ) : (
        <ScrollView
          className="flex-1 bg-background"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}
        >
          {/* author + when */}
          <View className="flex-row items-center gap-2">
            <Avatar name={entry.author_name} uri={entry.author_avatar} size={32} />
            <View className="flex-1">
              <Text variant="heading" numberOfLines={1}>
                {entry.author_name ?? "Member"}
              </Text>
              <Text variant="caption">{formatDayLabel(entry.created_at)}</Text>
            </View>
          </View>

          {/* day / activity tags */}
          {entry.day || activityTitle ? (
            <View className="flex-row flex-wrap gap-1.5">
              {entry.day ? <Tag label={formatDate(entry.day)} /> : null}
              {activityTitle ? <Tag label={activityTitle} /> : null}
            </View>
          ) : null}

          {/* body */}
          {entry.body.trim() ? (
            <Text selectable className="leading-6">
              {entry.body.trim()}
            </Text>
          ) : null}

          {/* media */}
          {entry.media.map((m) => (
            <Card key={m.id} className="gap-2">
              {m.media_type === "video" ? (
                <VideoItem uri={m.signedUrl} />
              ) : m.signedUrl ? (
                <Image
                  source={{ uri: m.signedUrl }}
                  style={{ width: "100%", height: 260, borderRadius: 10 }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-40 w-full items-center justify-center rounded-lg bg-muted">
                  <Text variant="muted" className="text-xs">
                    Unavailable
                  </Text>
                </View>
              )}
              {isAuthor ? (
                <Button
                  label="Remove"
                  variant="outline"
                  size="sm"
                  onPress={() => removeMedia(m.id, m.url)}
                />
              ) : null}
            </Card>
          ))}

          {error ? <Text className="text-destructive">{error}</Text> : null}
          {note ? (
            <Text variant="muted" className="text-xs">
              {note}
            </Text>
          ) : null}

          {/* author actions */}
          {isAuthor ? (
            <View className="mt-2 gap-2">
              <Button label="Edit entry" variant="secondary" onPress={() => setEditOpen(true)} />
              {confirmDelete ? (
                <View className="gap-2 rounded-2xl border border-destructive p-3">
                  <Text variant="muted" className="text-center">
                    Delete this entry and its photos/videos? This can&apos;t be undone.
                  </Text>
                  <View className="flex-row gap-2">
                    <Button
                      label="Delete"
                      className="flex-1"
                      onPress={onDelete}
                    />
                    <Button
                      label="Cancel"
                      variant="outline"
                      className="flex-1"
                      onPress={() => setConfirmDelete(false)}
                    />
                  </View>
                </View>
              ) : (
                <Button
                  label="Delete entry"
                  variant="outline"
                  onPress={() => setConfirmDelete(true)}
                />
              )}
            </View>
          ) : null}
        </ScrollView>
      )}

      {entry ? (
        <JournalComposer
          visible={editOpen}
          mode="edit"
          initial={{ body: entry.body, day: entry.day, activity_id: entry.activity_id }}
          startDate={trip?.start_date ?? null}
          endDate={trip?.end_date ?? null}
          activities={activities}
          alreadyHasMedia={entry.media.length > 0}
          saving={saving}
          progress={progress}
          onClose={() => setEditOpen(false)}
          onSubmit={onEdit}
        />
      ) : null}
    </TripThemeProvider>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-border bg-secondary px-2.5 py-1">
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background p-8">{children}</View>
  );
}
