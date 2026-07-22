import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

// Trippl card (Phase 10): rounded surface, hairline border, soft elevation.
export function Card({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      className={cn("rounded-2xl border border-border bg-card p-4", className)}
      style={[
        {
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        },
        style,
      ]}
      {...props}
    />
  );
}
