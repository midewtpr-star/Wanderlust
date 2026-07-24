import { Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";

// Accent send button. Mirrors the primary Button's fill/border/label logic so it
// respects the black-default + custom accent system and is never invisible — the
// White / near-bg accent renders as an outlined control with a contrast label.
export function SendButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Send message"
      accessibilityState={{ disabled: !!disabled }}
      className={cn(
        "h-11 w-11 items-center justify-center rounded-full border border-primary bg-accent-fill active:opacity-80",
        disabled ? "opacity-40" : "",
      )}
    >
      <Text
        className="text-primary-foreground"
        style={{ fontFamily: fontFamily("bold"), fontSize: 19, lineHeight: 22 }}
      >
        ↑
      </Text>
    </Pressable>
  );
}
