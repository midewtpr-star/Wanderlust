import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";
import { fontFamily, NEUTRALS } from "@/constants/theme";
import { useTheme } from "@/lib/theme-provider";

// Calor input (Phase 10): rounded, hairline border, token colors, themed
// placeholder + font.
export function Input({
  className,
  style,
  ...props
}: TextInputProps & { className?: string }) {
  const { scheme } = useTheme();
  return (
    <TextInput
      className={cn(
        "h-12 w-full rounded-xl border border-border bg-background px-3.5 text-base text-foreground",
        className,
      )}
      placeholderTextColor={NEUTRALS[scheme].textSecondary}
      style={[{ fontFamily: fontFamily("regular") }, style]}
      {...props}
    />
  );
}
