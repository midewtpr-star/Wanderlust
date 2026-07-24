import { View } from "react-native";
import { Text } from "@/components/ui/text";

// The earned "verified" pill (all required steps done), shown wherever members
// are listed. For non-verified members, render <StepProgress/> instead.
export function VerifiedBadge() {
  return (
    <View className="rounded-full border border-primary bg-accent-fill px-2 py-0.5">
      <Text className="text-xs font-semibold text-primary-foreground">
        ✓ Verified
      </Text>
    </View>
  );
}

// Partial progress for a member who isn't fully verified yet ("2/3 steps").
export function StepProgress({
  completed,
  required,
}: {
  completed: number;
  required: number;
}) {
  return (
    <Text variant="muted" className="text-xs">
      {completed}/{required} steps
    </Text>
  );
}
