import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { fontFamily, type FontWeight } from "@/constants/theme";
import { skinType, type TypeRole } from "@/constants/skins";
import { useSkin } from "@/lib/skin";

// Trippl text. Two roles, Apple-like (Display / Text). The active SKIN layers its
// own typography voice on top (family + case + tracking) — editorial serif display,
// collage mono body, poster condensed-caps display — without changing the scale.
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

// Which typographic role each variant plays (drives the skin's type treatment).
const ROLE: Record<string, TypeRole> = {
  "display-xl": "display",
  "display-lg": "display",
  title: "display",
  heading: "heading",
  default: "body",
  muted: "body",
  caption: "label",
};

export type TextVariant = VariantProps<typeof textVariants>;

export function Text({
  className,
  variant,
  style,
  ...props
}: TextProps & TextVariant) {
  const { skin } = useSkin();
  const v = variant ?? "default";
  const st = skinType(skin, ROLE[v]);
  const family = st.fontFamily ?? fontFamily(WEIGHT[v]);

  const skinStyle: TextStyle = {};
  if (family) skinStyle.fontFamily = family;
  if (st.textTransform) skinStyle.textTransform = st.textTransform;
  if (st.letterSpacing != null) skinStyle.letterSpacing = st.letterSpacing;

  return (
    <RNText
      className={cn(textVariants({ variant }), className)}
      style={[skinStyle, style]}
      {...props}
    />
  );
}
