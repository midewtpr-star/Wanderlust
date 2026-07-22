import { useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "./progress-bar";
import { VerifiedAnimation } from "./verified-animation";
import { useContribute } from "@/hooks/use-contribute";
import { formatDate } from "@/lib/dates";
import {
  formatCents,
  perPersonCents,
  isUnlocked,
  dollarsToCents,
  fraction,
  SPLIT_DENOMINATOR_LABEL,
} from "@/lib/money";
import type { MemberWithRsvp, MoneyPool, PoolContribution, PoolType } from "@/types";

const LABELS: Record<PoolType, string> = { airbnb: "Airbnb", car: "Car" };

// One money pool (Airbnb or car). Ledger only. Shows the equal split, my
// share/paid/remaining, a log-contribution action, group progress, and a
// per-member paid list. Admins set/edit the total. A share-completing
// contribution plays the step animation.
export function PoolCard({
  type,
  pool,
  tripId,
  userId,
  isAdmin,
  goingMembers,
  contributions,
  suggestedCents,
  defaultUnlockDate,
  carRef,
  onSetTotal,
  onChanged,
}: {
  type: PoolType;
  pool: MoneyPool | null;
  tripId: string;
  userId: string;
  isAdmin: boolean;
  goingMembers: MemberWithRsvp[];
  contributions: PoolContribution[];
  suggestedCents?: number | null;
  defaultUnlockDate: string | null;
  carRef?: string | null;
  onSetTotal: (
    type: PoolType,
    cents: number,
    unlockDate: string | null,
  ) => Promise<boolean>;
  onChanged: () => void;
}) {
  const label = LABELS[type];
  const { contribute, saving } = useContribute(tripId, userId);

  const [editing, setEditing] = useState(false);
  const [savingTotal, setSavingTotal] = useState(false);
  const [totalStr, setTotalStr] = useState(
    suggestedCents != null ? (suggestedCents / 100).toString() : "",
  );
  const [logging, setLogging] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goingCount = goingMembers.length;
  const total = pool?.total_cents ?? null;
  const share = perPersonCents(total, goingCount);
  const unlocked = isUnlocked(pool?.unlock_date);

  const paidByUser = useMemo(() => {
    const m = new Map<string, number>();
    contributions.forEach((c) =>
      m.set(c.user_id, (m.get(c.user_id) ?? 0) + c.amount_cents),
    );
    return m;
  }, [contributions]);

  const myPaid = paidByUser.get(userId) ?? 0;
  const myRemaining = share != null ? Math.max(0, share - myPaid) : 0;
  const totalContributed = useMemo(
    () => contributions.reduce((s, c) => s + c.amount_cents, 0),
    [contributions],
  );

  async function saveTotal() {
    setErr(null);
    const cents = dollarsToCents(totalStr);
    if (cents == null) {
      setErr("Enter a valid amount.");
      return;
    }
    setSavingTotal(true);
    const ok = await onSetTotal(type, cents, defaultUnlockDate);
    setSavingTotal(false);
    if (ok) {
      setEditing(false);
      onChanged();
    } else {
      setErr("Couldn't save the total — try again.");
    }
  }

  async function doLog(amountCents: number) {
    setErr(null);
    if (!pool || amountCents <= 0) {
      setErr("Enter an amount greater than zero.");
      return;
    }
    const res = await contribute({
      poolId: pool.id,
      poolType: type,
      amountCents,
      shareCents: share,
      paidBeforeCents: myPaid,
    });
    if (!res.ok) {
      setErr("Couldn't log that — try again.");
      return;
    }
    setAmountStr("");
    setLogging(false);
    if (res.stepCompleted) setCelebrate(true);
    onChanged();
  }

  // --- No total yet: admin setup / member pending ---
  if (!pool || total == null) {
    return (
      <Card className="gap-2">
        <Text variant="heading">{label} pool</Text>
        {isAdmin ? (
          <>
            <Text variant="muted">
              Set the {label.toLowerCase()} total. It splits equally across
              everyone {SPLIT_DENOMINATOR_LABEL}.
              {type === "car" && carRef ? ` (Car ref: ${carRef})` : ""}
            </Text>
            <Input
              value={totalStr}
              onChangeText={setTotalStr}
              placeholder={type === "airbnb" ? "e.g. 2400" : "e.g. 600"}
              keyboardType="decimal-pad"
            />
            <Button
              label={savingTotal ? "Saving…" : "Set total"}
              disabled={savingTotal}
              onPress={saveTotal}
            />
            {err ? <Text className="text-destructive">{err}</Text> : null}
          </>
        ) : (
          <Text variant="muted">
            Waiting for an admin to set the {label.toLowerCase()} total.
          </Text>
        )}
      </Card>
    );
  }

  // --- Active pool ---
  return (
    <Card className="gap-3">
      {celebrate ? (
        <View className="gap-2">
          <VerifiedAnimation label={`${label} share paid!`} />
          <Button label="Nice!" onPress={() => setCelebrate(false)} />
        </View>
      ) : (
        <>
          <View className="flex-row items-center justify-between">
            <Text variant="heading">{label} pool</Text>
            <View className="rounded-full bg-muted px-3 py-1">
              <Text variant="muted" className="text-xs">
                {unlocked ? "🔓 Unlocked" : `🔒 Unlocks ${formatDate(pool.unlock_date)}`}
              </Text>
            </View>
          </View>

          <Text variant="muted">
            {formatCents(total)} total · split across {goingCount}{" "}
            {SPLIT_DENOMINATOR_LABEL} ={" "}
            <Text className="font-semibold">{formatCents(share)}</Text> each
          </Text>

          <View className="gap-1 rounded-lg bg-muted p-3">
            <View className="flex-row justify-between">
              <Text variant="muted">My share</Text>
              <Text className="font-semibold">
                {share == null ? "—" : formatCents(share)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text variant="muted">Paid so far</Text>
              <Text>{formatCents(myPaid)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text variant="muted">Remaining</Text>
              <Text
                className={
                  share != null && myRemaining === 0
                    ? "text-green-600"
                    : "font-semibold"
                }
              >
                {share == null
                  ? "—"
                  : myRemaining === 0
                    ? "Paid in full ✓"
                    : formatCents(myRemaining)}
              </Text>
            </View>
            {share == null ? (
              <Text variant="muted" className="text-xs">
                Your share is set once members RSVP as going.
              </Text>
            ) : null}
          </View>

          {logging ? (
            <View className="gap-2">
              <Input
                value={amountStr}
                onChangeText={setAmountStr}
                placeholder="Amount (e.g. 50)"
                keyboardType="decimal-pad"
              />
              <View className="flex-row gap-2">
                <Button
                  label={saving ? "Logging…" : "Log it"}
                  disabled={saving}
                  className="flex-1"
                  onPress={() => {
                    const cents = dollarsToCents(amountStr);
                    if (cents == null) return setErr("Enter a valid amount.");
                    doLog(cents);
                  }}
                />
                {myRemaining > 0 ? (
                  <Button
                    label={`Pay ${formatCents(myRemaining)}`}
                    variant="secondary"
                    disabled={saving}
                    onPress={() => doLog(myRemaining)}
                  />
                ) : null}
              </View>
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => {
                  setLogging(false);
                  setAmountStr("");
                  setErr(null);
                }}
              />
            </View>
          ) : (
            <Button label="Log contribution" onPress={() => setLogging(true)} />
          )}

          <View className="gap-1">
            <View className="flex-row justify-between">
              <Text variant="muted" className="text-xs">
                Group progress
              </Text>
              <Text variant="muted" className="text-xs">
                {formatCents(totalContributed)} / {formatCents(total)}
              </Text>
            </View>
            <ProgressBar fraction={fraction(totalContributed, total)} />
          </View>

          <View className="gap-1">
            {goingMembers.map((m) => {
              const paid = paidByUser.get(m.user_id) ?? 0;
              const done = share != null && share > 0 && paid >= share;
              const partial = paid > 0 && !done;
              return (
                <View
                  key={m.user_id}
                  className="flex-row items-center justify-between"
                >
                  <Text numberOfLines={1} className="flex-1 pr-2">
                    {done ? "✅ " : partial ? "🟡 " : "⬜ "}
                    {m.display_name ?? "Member"}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    {formatCents(paid)}
                    {share ? ` / ${formatCents(share)}` : ""}
                  </Text>
                </View>
              );
            })}
          </View>

          {isAdmin ? (
            editing ? (
              <View className="gap-2">
                <Input
                  value={totalStr}
                  onChangeText={setTotalStr}
                  placeholder="New total"
                  keyboardType="decimal-pad"
                />
                <View className="flex-row gap-2">
                  <Button
                    label={savingTotal ? "Saving…" : "Save total"}
                    disabled={savingTotal}
                    className="flex-1"
                    onPress={saveTotal}
                  />
                  <Button
                    label="Cancel"
                    variant="outline"
                    onPress={() => setEditing(false)}
                  />
                </View>
              </View>
            ) : (
              <Button
                label="Edit total"
                variant="outline"
                size="sm"
                onPress={() => {
                  setTotalStr((total / 100).toString());
                  setEditing(true);
                }}
              />
            )
          ) : null}

          {err ? <Text className="text-destructive">{err}</Text> : null}
        </>
      )}
    </Card>
  );
}
