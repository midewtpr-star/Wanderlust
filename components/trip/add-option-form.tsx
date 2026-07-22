import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AddOptionInput } from "@/hooks/use-airbnb-votes";

// GROUPPAD SEAM (decisions.md D7) — manual Airbnb-option entry only. The real
// GroupPad browse → shortlist → AI-compare flow replaces this later; the seam
// stays at airbnb_options + airbnb_votes + trips.airbnb_pick. Build nothing else
// here (no AI compare, no external rental fetch).
export function AddOptionForm({
  onAdd,
}: {
  onAdd: (input: AddOptionInput) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [cost, setCost] = useState("");
  const [image, setImage] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!title.trim() && !url.trim()) {
      setErr("Add a title or a link.");
      return;
    }
    const parsed = parseFloat(cost.replace(/[^0-9.]/g, ""));
    setSaving(true);
    const ok = await onAdd({
      title: title.trim(),
      url: url.trim(),
      total_cost: Number.isNaN(parsed) ? null : parsed,
      image_url: image.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (ok) {
      setTitle("");
      setUrl("");
      setCost("");
      setImage("");
      setNotes("");
      setOpen(false);
    } else {
      setErr("Couldn't add that option — try again.");
    }
  }

  if (!open) {
    return (
      <Button label="+ Add an Airbnb option" variant="outline" onPress={() => setOpen(true)} />
    );
  }

  return (
    <Card className="gap-2">
      <Text variant="heading">Add an Airbnb option</Text>
      <Input value={title} onChangeText={setTitle} placeholder="Title (e.g. Lakeview cabin)" />
      <Input
        value={url}
        onChangeText={setUrl}
        placeholder="Airbnb link (https://…)"
        autoCapitalize="none"
        keyboardType="url"
      />
      <Input
        value={cost}
        onChangeText={setCost}
        placeholder="Total cost (e.g. 2400)"
        keyboardType="decimal-pad"
      />
      <Input
        value={image}
        onChangeText={setImage}
        placeholder="Image URL (optional)"
        autoCapitalize="none"
      />
      <Input value={notes} onChangeText={setNotes} placeholder="Notes (optional)" />
      <View className="flex-row gap-2">
        <Button
          label={saving ? "Adding…" : "Add option"}
          disabled={saving}
          className="flex-1"
          onPress={submit}
        />
        <Button label="Cancel" variant="outline" onPress={() => setOpen(false)} />
      </View>
      {err ? <Text className="text-destructive">{err}</Text> : null}
    </Card>
  );
}
