import { useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "./progress-ring";
import { usePersonalSafe } from "@/hooks/use-personal-safe";
import { formatDate } from "@/lib/dates";
import { formatCents, dollarsToCents, isUnlocked, fraction } from "@/lib/money";

// A member's PRIVATE savings safe. Self-only (RLS). Ledger only — sealed until
// the trip start date (a UI state, not custody). Progress ring toward the goal.
export function PersonalSafeCard({
  tripId,
  userId,
  defaultUnlockDate,
}: {
  tripId: string;
  userId: string;
  defaultUnlockDate: string | null;
}) {
  const safe = usePersonalSafe(tripId, userId, defaultUnlockDate);
  const [goalStr, setGoalStr] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const goal = safe.safe?.goal_cents ?? null;
  const unlockDate = safe.safe?.unlock_date ?? defaultUnlockDate;
  const unlocked = isUnlocked(unlockDate);
  const frac = goal ? fraction(safe.totalCents, goal) : safe.totalCents > 0 ? 1 : 0;

  async function saveGoal() {
    setErr(null);
    const cents = dollarsToCents(goalStr);
    if (cents == null) {
      setErr("Enter a valid amount.");
      return;
    }
    const ok = await safe.setGoal(cents, unlockDate);
    if (ok) setEditingGoal(false);
    else setErr("Couldn't save your goal — try again.");
  }

  async function addToSafe(cents: number) {
    setErr(null);
    if (cents <= 0) {
      setErr("Enter an amount greater than zero.");
      return;
    }
    const ok = await safe.addDeposit(cents);
    if (ok) {
      setAmountStr("");
      setAdding(false);
    } else {
      setErr("Couldn't add to your safe — try again.");
    }
  }

  if (safe.loading) {
    return (
      <Card>
        <View className="items-center py-4">
          <ActivityIndicator />
        </View>
      </Card>
    );
  }

  const needsGoal = goal == null || editingGoal;

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">Your savings safe</Text>
        <View className="rounded-full bg-muted px-3 py-1">
          <Text variant="muted" className="text-xs">
            {unlocked ? "🔓 Unlocked" : `🔒 Sealed till ${formatDate(unlockDate)}`}
          </Text>
        </View>
      </View>
      <Text variant="muted" className="text-xs">
        Private to you — no one else can see this. Ledger only; no real money
        moves.
      </Text>

      <View className="items-center py-2">
        <ProgressRing fraction={frac}>
          <Text variant="title">{formatCents(safe.totalCents)}</Text>
          <Text variant="muted" className="text-xs">
            {goal ? `of ${formatCents(goal)}` : "saved"}
          </Text>
        </ProgressRing>
      </View>

      {!unlocked ? (
        <Text variant="muted" className="text-center">
          🔒 Don&apos;t open till trip day. Keep saving — it unlocks on{" "}
          {formatDate(unlockDate)}.
        </Text>
      ) : (
        <Text className="text-center font-medium text-primary">
          🎉 Unlocked — enjoy the trip!
        </Text>
      )}

      {/* Add to safe */}
      {adding ? (
        <View className="gap-2">
          <Input
            value={amountStr}
            onChangeText={setAmountStr}
            placeholder="Amount (e.g. 25)"
            keyboardType="decimal-pad"
          />
          <View className="flex-row gap-2">
            <Button
              label={safe.saving ? "Adding…" : "Add"}
              disabled={safe.saving}
              className="flex-1"
              onPress={() => {
                const cents = dollarsToCents(amountStr);
                if (cents == null) return setErr("Enter a valid amount.");
                addToSafe(cents);
              }}
            />
            <Button
              label="Cancel"
              variant="outline"
              onPress={() => {
                setAdding(false);
                setAmountStr("");
                setErr(null);
              }}
            />
          </View>
        </View>
      ) : (
        <Button label="Add to safe" onPress={() => setAdding(true)} />
      )}

      {/* Goal setup / edit */}
      {needsGoal ? (
        <View className="gap-2">
          <Text variant="muted" className="text-xs">
            Set a personal goal (unlocks on {formatDate(unlockDate)}).
          </Text>
          <Input
            value={goalStr}
            onChangeText={setGoalStr}
            placeholder="Goal amount (e.g. 500)"
            keyboardType="decimal-pad"
          />
          <View className="flex-row gap-2">
            <Button
              label={safe.saving ? "Saving…" : "Set goal"}
              disabled={safe.saving}
              className="flex-1"
              onPress={saveGoal}
            />
            {goal != null ? (
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => setEditingGoal(false)}
              />
            ) : null}
          </View>
        </View>
      ) : (
        <Button
          label="Edit goal"
          variant="outline"
          size="sm"
          onPress={() => {
            setGoalStr(goal != null ? (goal / 100).toString() : "");
            setEditingGoal(true);
          }}
        />
      )}

      {err ? <Text className="text-destructive">{err}</Text> : null}
    </Card>
  );
}
