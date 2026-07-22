import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateField } from "@/components/ui/date-field";
import type { ActivityInput } from "@/types";

// Create an activity — blank, or prefilled from a local idea (title/location/
// link). scheduled_for is optional (date; stored at noon to dodge TZ edges).
export function ActivityForm({
  initial,
  saving,
  onCreate,
  onClose,
}: {
  initial: ActivityInput | null;
  saving: boolean;
  onCreate: (input: ActivityInput) => Promise<boolean>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [date, setDate] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!title.trim()) {
      setErr("Add a title.");
      return;
    }
    const scheduled_for = date
      ? new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          12,
        ).toISOString()
      : null;
    const ok = await onCreate({
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      url: url.trim() || null,
      scheduled_for,
    });
    if (!ok) setErr("Couldn't create the activity — try again.");
  }

  return (
    <Card className="gap-2">
      <Text variant="heading">New activity</Text>
      <Input value={title} onChangeText={setTitle} placeholder="Title (e.g. Sunset hike)" />
      <Input
        value={description ?? ""}
        onChangeText={setDescription}
        placeholder="Description (optional)"
      />
      <Input
        value={location ?? ""}
        onChangeText={setLocation}
        placeholder="Location (optional)"
      />
      <Input
        value={url ?? ""}
        onChangeText={setUrl}
        placeholder="Link (optional)"
        autoCapitalize="none"
        keyboardType="url"
      />
      <DateField value={date} onChange={setDate} placeholder="When (optional)" />
      <View className="flex-row gap-2">
        <Button
          label={saving ? "Creating…" : "Create activity"}
          disabled={saving}
          className="flex-1"
          onPress={submit}
        />
        <Button label="Cancel" variant="outline" onPress={onClose} />
      </View>
      {err ? <Text className="text-destructive">{err}</Text> : null}
    </Card>
  );
}
