import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

// React Native Reusables-style Input primitive (NativeWind). D1.
export function Input({
  className,
  ...props
}: TextInputProps & { className?: string }) {
  return (
    <TextInput
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground",
        className,
      )}
      placeholderTextColor="#9ca3af"
      {...props}
    />
  );
}
