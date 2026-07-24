import { useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import type { AirbnbOptionInput } from "@/types";

// GROUPPAD SEAM — replaced by the GroupPad module later (decisions.md D7).
// Manual Airbnb-option entry only (link + total cost + optional image).
// Do NOT build voting / AI-compare / lock here — that is GroupPad's job.
export function AirbnbOptionsEditor({
  options,
  onChange,
}: {
  options: AirbnbOptionInput[];
  onChange: (next: AirbnbOptionInput[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [cost, setCost] = useState("");
  const [image, setImage] = useState("");

  function add() {
    if (!url.trim() && !title.trim()) return;
    const parsed = parseFloat(cost.replace(/[^0-9.]/g, ""));
    onChange([
      ...options,
      {
        title: title.trim(),
        url: url.trim(),
        total_cost: Number.isNaN(parsed) ? null : parsed,
        image_url: image.trim() || null,
      },
    ]);
    setTitle("");
    setUrl("");
    setCost("");
    setImage("");
  }

  function remove(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  return (
    <View className="gap-3">
      {options.length > 0 ? (
        <View className="gap-2">
          {options.map((o, i) => (
            <Card key={i} className="flex-row items-center justify-between p-3">
              <View className="flex-1 pr-2">
                <Text numberOfLines={1}>{o.title || o.url || "Option"}</Text>
                <Text variant="muted" numberOfLines={1}>
                  {o.url}
                  {o.total_cost != null ? ` · $${o.total_cost}` : ""}
                </Text>
              </View>
              <Pressable onPress={() => remove(i)} className="active:opacity-70">
                <Text className="text-destructive">Remove</Text>
              </Pressable>
            </Card>
          ))}
        </View>
      ) : null}

      <Card className="gap-2">
        <Label>Add an Airbnb option</Label>
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
        <Pressable
          onPress={add}
          className="items-center rounded-lg bg-secondary py-2 active:opacity-80"
        >
          <Text className="font-semibold text-secondary-foreground">
            Add Airbnb option
          </Text>
        </Pressable>
      </Card>
    </View>
  );
}
