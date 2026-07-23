import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";
import { skinRadius } from "@/constants/skins";
import { useSkin } from "@/lib/skin";

// Trippl input: hairline border, token colors, themed placeholder. Corner radius +
// placeholder color follow the active skin.
export function Input({
  className,
  style,
  ...props
}: TextInputProps & { className?: string }) {
  const { skin, neutrals } = useSkin();
  return (
    <TextInput
      className={cn(
        "h-12 w-full border border-border bg-background px-3.5 text-base text-foreground",
        skinRadius(skin),
        className,
      )}
      placeholderTextColor={neutrals.textSecondary}
      style={[{ fontFamily: fontFamily("regular") }, style]}
      {...props}
    />
  );
}
