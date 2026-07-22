import { Pressable, Text, type PressableProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";

// Calor button (Phase 10). Rounded/tactile; the accent drives the primary fill.
// Neutrals carry secondary/outline. See docs/design.md.
const buttonVariants = cva(
  "flex-row items-center justify-center rounded-xl active:opacity-80",
  {
    variants: {
      variant: {
        default: "bg-primary",
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
  return (
    <Pressable
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      <Text
        className={cn(buttonTextVariants({ variant }), textClassName)}
        style={{ fontFamily: fontFamily("semibold") }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
