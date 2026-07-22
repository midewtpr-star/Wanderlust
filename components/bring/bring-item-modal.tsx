import { useEffect, useState } from "react";
import { Modal, View, Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";
import type { BringItem, BringItemInput, BringPriority } from "@/types";

const CATEGORIES = ["gear", "food", "docs", "misc"];

// Create or edit a bring item with all fields. Delete lives here in edit mode
// (creator/admin only — the screen only opens edit for those).
export function BringItemModal({
  visible,
  mode,
  initial,
  onClose,
  onSubmit,
  onDelete,
  saving,
}: {
  visible: boolean;
  mode: "create" | "edit";
  initial?: BringItem | null;
  onClose: () => void;
  onSubmit: (input: BringItemInput) => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [priority, setPriority] = useState<BringPriority>("optional");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  // Seed the form each time it opens (from `initial` when editing).
  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? "");
    setCategory(initial?.category ?? null);
    setPriority(initial?.priority ?? "optional");
    setQuantity(initial?.quantity != null ? String(initial.quantity) : "");
    setNotes(initial?.notes ?? "");
  }, [visible, initial]);

  function submit() {
    if (!name.trim()) return;
    const q = parseInt(quantity, 10);
    onSubmit({
      name: name.trim(),
      category,
      priority,
      quantity: Number.isFinite(q) && q > 0 ? q : null,
      notes: notes.trim() || null,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[88%] rounded-t-3xl bg-background p-6">
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text variant="title" className="mb-4">
              {mode === "edit" ? "Edit item" : "New item"}
            </Text>

            <Text variant="caption" className="mb-1">
              Item
            </Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="e.g. Bluetooth speaker"
              autoFocus
            />

            <Text variant="caption" className="mb-1 mt-4">
              Priority
            </Text>
            <View className="flex-row gap-2">
              <Chip label="Optional" active={priority === "optional"} onPress={() => setPriority("optional")} />
              <Chip label="Needed" active={priority === "needed"} onPress={() => setPriority("needed")} />
            </View>

            <Text variant="caption" className="mb-1 mt-4">
              Category (optional)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip label="None" active={category === null} onPress={() => setCategory(null)} />
              {CATEGORIES.map((c) => (
                <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>

            <Text variant="caption" className="mb-1 mt-4">
              Quantity (optional)
            </Text>
            <Input
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 2"
              keyboardType="number-pad"
            />

            <Text variant="caption" className="mb-1 mt-4">
              Notes (optional)
            </Text>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Details, brand, who it's for…"
              multiline
              className="h-20"
              style={{ textAlignVertical: "top" }}
            />

            <View className="m-1 mt-6 gap-2">
              <Button
                label={saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add item"}
                onPress={submit}
                disabled={!name.trim() || saving}
              />
              {mode === "edit" && onDelete ? (
                <Button label="Delete item" variant="destructive" onPress={onDelete} />
              ) : null}
              <Button label="Cancel" variant="outline" onPress={onClose} />
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
        className={cn(
          "text-sm capitalize",
          active ? "text-primary-foreground" : "text-foreground",
        )}
        style={{ fontFamily: fontFamily("medium") }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
