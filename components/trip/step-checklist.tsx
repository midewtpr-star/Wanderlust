import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Pop, FadeUp } from "@/components/ui/motion";
import { useTheme } from "@/lib/theme-provider";
import { useMemberSteps } from "@/hooks/use-member-steps";
import type { StepKey } from "@/types";

const STEP_LABELS: Record<StepKey, string> = {
  travel_proof: "Confirm your travel",
  airbnb_paid: "Pay your Airbnb share",
  car_paid: "Pay your car share",
};

// One checklist row: a check circle (which POPS in when the step is done, per the
// design's step-completion moment) + a label that dims + strikes through.
function StepRow({ label, done, isNext }: { label: string; done: boolean; isNext: boolean }) {
  const { tokens: t } = useTheme();
  const shape = Math.min(t.btnRadius, 13); // editorial circle · collage 6 · poster 2
  return (
    <View className="flex-row items-center gap-3">
      {done ? (
        <Pop>
          <View style={{ width: 26, height: 26, borderRadius: shape, backgroundColor: t.accent, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: t.accentInk, fontWeight: "800", fontSize: 15 }}>✓</Text>
          </View>
        </Pop>
      ) : (
        <View style={{ width: 26, height: 26, borderRadius: shape, borderWidth: 2, borderColor: t.dim }} />
      )}
      <Text className={done ? "flex-1 text-muted-foreground line-through" : isNext ? "flex-1 font-semibold" : "flex-1"}>
        {label}
      </Text>
    </View>
  );
}

// The current member's progressive checklist. Steps complete via the real flows
// (travel proof, payments) — not by tapping — so this reflects true state; the
// check pops in and the next step reveals as each completes.
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
        {required.map((k) => (
          <StepRow key={k} label={STEP_LABELS[k]} done={isDone(k)} isNext={k === firstIncomplete} />
        ))}
      </View>

      {allDone ? (
        <FadeUp>
          <View className="items-center gap-1 pt-1">
            <Text variant="heading">🎉 You&apos;re all set</Text>
            <Text variant="muted" className="text-center">
              Every step done. Your verified badge lights up next.
            </Text>
          </View>
        </FadeUp>
      ) : (
        // Keyed on the current next step so it re-reveals (slides up) as steps complete.
        <FadeUp key={firstIncomplete}>
          <View className="rounded-lg bg-muted p-3">
            <Text className="font-semibold">Next: {STEP_LABELS[firstIncomplete]}</Text>
          </View>
        </FadeUp>
      )}
    </Card>
  );
}
