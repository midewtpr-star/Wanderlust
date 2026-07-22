import { Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

// Lightweight "love" toggle — a heart + count. Loved uses the accent ink
// (text-primary → --accent), so it respects the current accent in both modes.
export function ReactionButton({
  loved,
  count,
  onToggle,
  size = "md",
}: {
  loved: boolean;
  count: number;
  onToggle: () => void;
  size?: "sm" | "md";
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={loved ? "Remove your love" : "Love this outfit"}
      hitSlop={8}
      className="flex-row items-center gap-1 active:opacity-70"
    >
      <Text
        className={cn(
          loved ? "text-primary" : "text-muted-foreground",
          size === "sm" ? "text-sm" : "text-base",
        )}
      >
        {loved ? "♥" : "♡"}
      </Text>
      {count > 0 ? (
        <Text
          variant="caption"
          className={loved ? "text-primary" : "text-muted-foreground"}
        >
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}
