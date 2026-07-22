import { useMemo, useState } from "react";
import { Modal, View, Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";
import { toISODate, parseISODate, formatDate } from "@/lib/dates";
import type { Activity, OutfitInput } from "@/types";

// Inclusive list of trip days for the day chips (capped so a huge range can't
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

export function CreateOutfitModal({
  visible,
  onClose,
  onCreate,
  startDate,
  endDate,
  activities,
  saving,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: OutfitInput) => void;
  startDate: string | null;
  endDate: string | null;
  activities: Activity[];
  saving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const days = useMemo(() => tripDays(startDate, endDate), [startDate, endDate]);

  function reset() {
    setTitle("");
    setDay(null);
    setActivityId(null);
    setNotes("");
  }
  function submit() {
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      day,
      activity_id: activityId,
      notes: notes.trim() || null,
    });
    reset();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[88%] rounded-t-3xl bg-background p-6">
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text variant="title" className="mb-4">
              New outfit
            </Text>

            <Text variant="caption" className="mb-1">
              Title
            </Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Beach day fit"
              autoFocus
            />

            <Text variant="caption" className="mb-1 mt-4">
              Day
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-1"
            >
              <View className="flex-row gap-2 px-1">
                <Chip label="Any day" active={day === null} onPress={() => setDay(null)} />
                {days.map((d) => (
                  <Chip
                    key={d}
                    label={formatDate(d)}
                    active={day === d}
                    onPress={() => setDay(d)}
                  />
                ))}
              </View>
            </ScrollView>

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

            <Text variant="caption" className="mb-1 mt-4">
              Notes (optional)
            </Text>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Vibe, colors, must-haves…"
              multiline
              className="h-20"
              style={{ textAlignVertical: "top" }}
            />

            <View className="m-1 mt-6 gap-2">
              <Button
                label={saving ? "Saving…" : "Create outfit"}
                onPress={submit}
                disabled={!title.trim() || saving}
              />
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => {
                  reset();
                  onClose();
                }}
              />
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
