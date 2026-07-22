import { Text as RNText, type TextProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// React Native Reusables-style Text primitive (NativeWind + cva). D1.
const textVariants = cva("text-base text-foreground", {
  variants: {
    variant: {
      default: "",
      muted: "text-sm text-muted-foreground",
      heading: "text-lg font-semibold",
      title: "text-2xl font-bold",
    },
  },
  defaultVariants: { variant: "default" },
});

export type TextVariant = VariantProps<typeof textVariants>;

export function Text({
  className,
  variant,
  ...props
}: TextProps & TextVariant) {
  return (
    <RNText className={cn(textVariants({ variant }), className)} {...props} />
  );
}
