import {
  TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-provider";

// Trippl input, token-driven per the design system. Sits on the skin's CARD
// surface (never the screen ground — poster's ground is the cobalt field), with
// the skin's border, corner radius and body font. Placeholder is the dim token.
export function Input({
  className,
  style,
  ...props
}: TextInputProps & { className?: string }) {
  const { tokens: t, neutrals } = useTheme();
  return (
    <TextInput
      className={cn("h-12 w-full px-3.5 text-base", className)}
      placeholderTextColor={neutrals.textSecondary}
      style={[
        {
          backgroundColor: t.cardBg,
          color: neutrals.text,
          borderRadius: t.radius,
          borderWidth: t.cardBorder?.width ?? 1,
          borderColor: t.cardBorder?.color ?? neutrals.border,
          fontFamily: t.fontBody,
        },
        style as StyleProp<TextStyle>,
      ]}
      {...props}
    />
  );
}
