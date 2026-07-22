import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { RsvpStatus } from "@/types";

const OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "not", label: "Can't go" },
];

// Soft "verbal" RSVP (foundation §6-2). Travel proof (later) is the hard confirm.
export function RsvpControl({
  value,
  onChange,
  disabled,
}: {
  value: RsvpStatus | null;
  onChange: (s: RsvpStatus) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row gap-2">
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            className={cn(
              "flex-1 items-center rounded-lg border py-2 active:opacity-80",
              active ? "border-primary bg-primary" : "border-border bg-background",
            )}
          >
            <Text
              className={cn(
                "font-semibold",
                active ? "text-primary-foreground" : "text-foreground",
              )}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
