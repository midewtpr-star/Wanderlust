import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { useMemberSteps } from "@/hooks/use-member-steps";
import type { StepKey } from "@/types";

const STEP_LABELS: Record<StepKey, string> = {
  travel_proof: "Confirm your travel",
  airbnb_paid: "Pay your Airbnb share",
  car_paid: "Pay your car share",
};

// The current member's progressive checklist. Completed steps check off; the
// next incomplete step is surfaced prominently. All done ⇒ "You're all set"
// (the aggregate verified badge is built in the next phase).
export function StepChecklist({
  tripId,
  userId,
  hasCarPool,
  version,
}: {
  tripId: string;
  userId: string;
  hasCarPool: boolean;
  version: number;
}) {
  const { steps, loading } = useMemberSteps(tripId, userId, version);

  const required: StepKey[] = ["travel_proof", "airbnb_paid"];
  if (hasCarPool) required.push("car_paid");

  const isDone = (k: StepKey) => steps.get(k)?.completed ?? false;
  const firstIncomplete = required.find((k) => !isDone(k)) ?? null;
  const allDone = firstIncomplete === null;

  if (loading) {
    return (
      <Card>
        <View className="items-center py-4">
          <ActivityIndicator />
        </View>
      </Card>
    );
  }

  return (
    <Card className="gap-3">
      <Text variant="heading">Your checklist</Text>
      <View className="gap-2">
        {required.map((k) => {
          const done = isDone(k);
          const isNext = k === firstIncomplete;
          return (
            <View key={k} className="flex-row items-center gap-3">
              <Text>{done ? "✅" : isNext ? "🔹" : "⬜"}</Text>
              <Text
                className={
                  done
                    ? "text-muted-foreground line-through"
                    : isNext
                      ? "font-semibold"
                      : ""
                }
              >
                {STEP_LABELS[k]}
              </Text>
            </View>
          );
        })}
      </View>

      {allDone ? (
        <View className="items-center gap-1 pt-1">
          <Text variant="heading">🎉 You&apos;re all set</Text>
          <Text variant="muted" className="text-center">
            Every step done. Your verified badge lights up next.
          </Text>
        </View>
      ) : (
        <View className="rounded-lg bg-muted p-3">
          <Text className="font-semibold">
            Next: {STEP_LABELS[firstIncomplete]}
          </Text>
        </View>
      )}
    </Card>
  );
}
