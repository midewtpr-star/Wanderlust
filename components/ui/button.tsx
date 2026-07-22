import { Pressable, Text, type PressableProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// React Native Reusables-style Button primitive (NativeWind + cva). D1.
const buttonVariants = cva(
  "flex-row items-center justify-center rounded-lg active:opacity-90",
  {
    variants: {
      variant: {
        default: "bg-primary",
        secondary: "bg-secondary",
        outline: "border border-border bg-background",
        destructive: "bg-destructive",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva("text-sm font-semibold", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      outline: "text-foreground",
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
      <Text className={cn(buttonTextVariants({ variant }), textClassName)}>
        {label}
      </Text>
    </Pressable>
  );
}
