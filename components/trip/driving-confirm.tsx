import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Driving path (built first — it's the simple one). No upload, no AI: the member
// affirms they're making their own way there and is verified instantly.
export function DrivingConfirm({
  onConfirm,
  onCancel,
  saving,
  error,
}: {
  onConfirm: (note: string) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [note, setNote] = useState("");

  return (
    <View className="gap-3">
      <Text variant="heading">Driving or carpooling</Text>
      <Text variant="muted">
        Confirm you&apos;re making your own way there. No upload needed — you&apos;ll
        be marked as coming right away.
      </Text>
      <Input
        value={note}
        onChangeText={setNote}
        placeholder="Optional note (e.g. carpooling with Sam)"
        autoCapitalize="sentences"
        editable={!saving}
      />
      <View className="flex-row gap-2">
        <Button
          label={saving ? "Confirming…" : "I'm driving"}
          onPress={() => onConfirm(note)}
          disabled={saving}
          className="flex-1"
        />
        <Button
          label="Back"
          variant="outline"
          onPress={onCancel}
          disabled={saving}
        />
      </View>
      {error ? <Text className="text-destructive">{error}</Text> : null}
    </View>
  );
}
