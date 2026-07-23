import { Pressable, Text, type PressableProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";
import { skinRadius } from "@/constants/skins";
import { useSkin } from "@/lib/skin";

// Trippl button. The accent drives the primary fill; the active SKIN sets the
// corner radius (editorial rounded / poster hard-edged) and, for poster, uppercase
// labels. See docs/design.md.
const buttonVariants = cva(
  "flex-row items-center justify-center active:opacity-80",
  {
    variants: {
      variant: {
        // Fill = accent-fill; a same-color accent border is seamless on solid
        // accents but becomes a visible outline when the fill is transparent
        // (White / near-bg accents) — so the primary button is never invisible.
        default: "border border-primary bg-accent-fill",
        secondary: "bg-secondary",
        outline: "border border-border bg-transparent",
        ghost: "bg-transparent",
        destructive: "bg-destructive",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-9 px-3.5",
        lg: "h-14 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva("text-[15px] font-semibold", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      outline: "text-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    label: string;
    className?: string;
    textClassName?: string;
  };

export function Button({
  label,
  variant,
  size,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const { skin } = useSkin();
  const posterLabel =
    skin === "poster"
      ? { textTransform: "uppercase" as const, letterSpacing: 0.6 }
      : {};
  return (
    <Pressable
      className={cn(buttonVariants({ variant, size }), skinRadius(skin), className)}
      accessibilityRole="button"
      {...props}
    >
      <Text
        className={cn(buttonTextVariants({ variant }), textClassName)}
        style={{ fontFamily: fontFamily("semibold"), ...posterLabel }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
