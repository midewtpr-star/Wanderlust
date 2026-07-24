import type { ComponentProps } from "react";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

// Form field label.
export function Label({ className, ...props }: ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn("mb-1 text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}
