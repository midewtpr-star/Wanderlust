import { useEffect, useMemo, useState } from "react";
import { Modal, View, Pressable, ScrollView, Platform, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";
import { toISODate, parseISODate, formatDate } from "@/lib/dates";
import type { Activity, JournalEntryInput } from "@/types";
import type { JournalUpload, UploadProgress } from "@/hooks/use-journal";

type Staged = { file: JournalUpload["file"]; kind: JournalUpload["kind"]; preview: string };

// Inclusive list of trip days for the day chips (capped so a long trip can't
// blow up the row).
function tripDays(start: string | null, end: string | null): string[] {
  const s = parseISODate(start);
  if (!s) return [];
  const last = parseISODate(end) ?? s;
  const out: string[] = [];
  const d = new Date(s);
  let guard = 0;
  while (d <= last && guard < 40) {
    out.push(toISODate(d));
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return out;
}

function toStaged(a: ImagePicker.ImagePickerAsset): Staged {
  const isVideo = a.type === "video" || (a.mimeType?.startsWith("video") ?? false);
  return {
    file: { uri: a.uri, name: a.fileName, mimeType: a.mimeType, size: a.fileSize ?? null },
    kind: isVideo ? "video" : "photo",
    preview: a.uri,
  };
}

// The journal entry composer — long-form text + multiple photos/videos in one
// composition, optionally pinned to a day and linked to an activity. Used for
// both new entries and editing (existing media is managed on the detail screen;
// this only edits text/day/activity + stages NEW media to add).
export function JournalComposer({
  visible,
  mode,
  initial,
  startDate,
  endDate,
  activities,
  alreadyHasMedia = false,
  saving,
  progress,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  mode: "create" | "edit";
  initial?: { body: string; day: string | null; activity_id: string | null } | null;
  startDate: string | null;
  endDate: string | null;
  activities: Activity[];
  alreadyHasMedia?: boolean;
  saving: boolean;
  progress: UploadProgress;
  onClose: () => void;
  onSubmit: (input: JournalEntryInput, uploads: JournalUpload[]) => void;
}) {
  const [body, setBody] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const days = useMemo(() => tripDays(startDate, endDate), [startDate, endDate]);

  // (Re)initialize each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setBody(initial?.body ?? "");
    setDay(initial?.day ?? null);
    setActivityId(initial?.activity_id ?? null);
    setStaged([]);
    setNote(null);
  }, [visible, initial?.body, initial?.day, initial?.activity_id]);

  async function pickLibrary() {
    setNote(null);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (res.canceled) return;
    setStaged((s) => [...s, ...res.assets.map(toStaged)]);
  }

  async function capture() {
    setNote(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setNote("Camera permission is needed to capture media.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (res.canceled) return;
    setStaged((s) => [...s, ...res.assets.map(toStaged)]);
  }

  const canSubmit = body.trim().length > 0 || staged.length > 0 || alreadyHasMedia;

  function submit() {
    if (!canSubmit || saving) return;
    onSubmit(
      { body, day, activity_id: activityId },
      staged.map((s) => ({ file: s.file, kind: s.kind })),
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[92%] rounded-t-3xl bg-background p-6">
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text variant="title" className="mb-4">
              {mode === "edit" ? "Edit entry" : "New journal entry"}
            </Text>

            <Input
              value={body}
              onChangeText={setBody}
              placeholder="What happened? Write as much as you like…"
              autoFocus={mode === "create"}
              multiline
              className="min-h-[140px]"
              style={{ textAlignVertical: "top" }}
            />

            {/* media stager */}
            <Text variant="caption" className="mb-1 mt-4">
              Photos & videos
            </Text>
            <View className="flex-row gap-2">
              <Button
                label="Add from library"
                variant="secondary"
                className="flex-1"
                onPress={pickLibrary}
                disabled={saving}
              />
              {Platform.OS !== "web" ? (
                <Button label="Camera" variant="secondary" onPress={capture} disabled={saving} />
              ) : null}
            </View>
            {staged.length ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {staged.map((s, i) => (
                  <View key={i} className="relative">
                    {s.kind === "photo" ? (
                      <Image
                        source={{ uri: s.preview }}
                        style={{ width: 72, height: 72, borderRadius: 10 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="h-[72px] w-[72px] items-center justify-center rounded-[10px] bg-muted">
                        <Text className="text-xl">🎬</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => setStaged((arr) => arr.filter((_, idx) => idx !== i))}
                      accessibilityRole="button"
                      accessibilityLabel="Remove"
                      className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-foreground"
                    >
                      <Text style={{ color: "#fff", fontSize: 12, lineHeight: 14 }}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {/* day */}
            <Text variant="caption" className="mb-1 mt-4">
              Day
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              <View className="flex-row gap-2 px-1">
                <Chip label="No day" active={day === null} onPress={() => setDay(null)} />
                {days.map((d) => (
                  <Chip key={d} label={formatDate(d)} active={day === d} onPress={() => setDay(d)} />
                ))}
              </View>
            </ScrollView>

            {/* activity */}
            {activities.length ? (
              <>
                <Text variant="caption" className="mb-1 mt-4">
                  Link an activity (optional)
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Chip
                    label="None"
                    active={activityId === null}
                    onPress={() => setActivityId(null)}
                  />
                  {activities.map((a) => (
                    <Chip
                      key={a.id}
                      label={a.title}
                      active={activityId === a.id}
                      onPress={() => {
                        setActivityId(a.id);
                        if (a.scheduled_for) setDay(toISODate(new Date(a.scheduled_for)));
                      }}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {progress ? (
              <View className="mt-4 flex-row items-center gap-2">
                <ActivityIndicator />
                <Text variant="muted">
                  Uploading {progress.done}/{progress.total}…
                </Text>
              </View>
            ) : null}
            {note ? (
              <Text variant="muted" className="mt-3 text-xs">
                {note}
              </Text>
            ) : null}

            <View className="m-1 mt-6 gap-2">
              <Button
                label={
                  saving
                    ? "Saving…"
                    : mode === "edit"
                      ? "Save changes"
                      : staged.length
                        ? `Post entry · ${staged.length} item${staged.length === 1 ? "" : "s"}`
                        : "Post entry"
                }
                onPress={submit}
                disabled={!canSubmit || saving}
              />
              <Button label="Cancel" variant="outline" onPress={onClose} disabled={saving} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
        "rounded-full border px-3 py-1.5 active:opacity-80",
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
