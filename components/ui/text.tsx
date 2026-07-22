import { Text as RNText, type TextProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { fontFamily, type FontWeight } from "@/constants/theme";

// Trippl text (Phase 10). Two roles, Apple-like: Display for large titles (tighter
// tracking, heavier), Text for body/UI. See docs/design.md for the scale.
const textVariants = cva("text-foreground", {
  variants: {
    variant: {
      "display-xl": "text-[40px] font-bold leading-[44px] tracking-tight",
      "display-lg": "text-[30px] font-bold leading-9 tracking-tight",
      title: "text-[22px] font-semibold leading-7 tracking-tight",
      heading: "text-lg font-semibold",
      default: "text-base leading-6",
      muted: "text-sm text-muted-foreground",
      caption: "text-[13px] text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

const WEIGHT: Record<string, FontWeight> = {
  "display-xl": "bold",
  "display-lg": "bold",
  title: "semibold",
  heading: "semibold",
  default: "regular",
  muted: "regular",
  caption: "regular",
};

export type TextVariant = VariantProps<typeof textVariants>;

export function Text({
  className,
  variant,
  style,
  ...props
}: TextProps & TextVariant) {
  const family = fontFamily(WEIGHT[variant ?? "default"]);
  return (
    <RNText
      className={cn(textVariants({ variant }), className)}
      style={family ? [{ fontFamily: family }, style] : style}
      {...props}
    />
  );
}
