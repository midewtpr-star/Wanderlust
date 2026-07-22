import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { OutfitItemWithUrl } from "@/hooks/use-outfit-items";

function providerLabel(p: string): string {
  return p === "pinterest" ? "Pinterest" : p === "upload" ? "Upload" : "Link";
}

// One moodboard card: the item image (tap → open the source), a provider badge,
// and — for the owner — reorder + delete controls.
export function ItemCard({
  item,
  editable,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onDelete,
}: {
  item: OutfitItemWithUrl;
  editable: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onDelete: () => void;
}) {
  async function open() {
    if (item.source_url) await WebBrowser.openBrowserAsync(item.source_url);
  }

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-card">
      <Pressable
        onPress={open}
        disabled={!item.source_url}
        accessibilityRole={item.source_url ? "link" : "image"}
        accessibilityLabel={item.title ?? "Outfit item"}
        className="aspect-square w-full bg-muted"
      >
        {item.display_url ? (
          <Image
            source={{ uri: item.display_url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="flex-1 items-center justify-center p-2">
            <Text variant="caption" numberOfLines={3} className="text-center">
              {item.title ?? item.source_url ?? "No preview"}
            </Text>
          </View>
        )}
        <View className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5">
          <Text className="text-[10px] text-white">
            {providerLabel(item.provider)}
          </Text>
        </View>
      </Pressable>

      {editable ? (
        <View className="flex-row items-center justify-between px-1 py-1">
          <View className="flex-row">
            <IconBtn label="◀" disabled={!canMoveLeft} onPress={onMoveLeft} a11y="Move left" />
            <IconBtn label="▶" disabled={!canMoveRight} onPress={onMoveRight} a11y="Move right" />
          </View>
          <IconBtn label="✕" onPress={onDelete} a11y="Remove item" />
        </View>
      ) : item.source_url ? (
        <Pressable onPress={open} className="px-2 py-1.5 active:opacity-70">
          <Text variant="caption" numberOfLines={1} className="text-primary">
            Open source ↗
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function IconBtn({
  label,
  onPress,
  disabled,
  a11y,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  a11y: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      className={cn("px-2.5 py-1 active:opacity-70", disabled ? "opacity-30" : "")}
    >
      <Text className="text-foreground">{label}</Text>
    </Pressable>
  );
}
