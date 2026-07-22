import { useEffect, useState } from "react";
import { View, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ActivityForm } from "./activity-form";
import { useActivities } from "@/hooks/use-activities";
import { formatDate } from "@/lib/dates";
import type { ActivityInput } from "@/types";

// Trip activities: list + create (blank or prefilled from a local idea). Tapping
// a row opens the activity detail (media gallery + upload).
export function ActivitiesSection({
  tripId,
  userId,
  prefill,
  onPrefillConsumed,
}: {
  tripId: string;
  userId: string;
  prefill: ActivityInput | null;
  onPrefillConsumed: () => void;
}) {
  const router = useRouter();
  const { activities, loading, error, create } = useActivities(tripId, userId);
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<ActivityInput | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);

  // An idea was turned into an activity — open the form prefilled.
  useEffect(() => {
    if (prefill) {
      setInitial(prefill);
      setFormKey((k) => k + 1);
      setOpen(true);
      onPrefillConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  async function handleCreate(input: ActivityInput): Promise<boolean> {
    setSaving(true);
    const created = await create(input);
    setSaving(false);
    if (created) {
      setOpen(false);
      setInitial(null);
    }
    return !!created;
  }

  return (
    <View className="gap-3">
      {!open ? (
        <Button
          label="+ New activity"
          variant="outline"
          onPress={() => {
            setInitial(null);
            setFormKey((k) => k + 1);
            setOpen(true);
          }}
        />
      ) : (
        <ActivityForm
          key={formKey}
          initial={initial}
          saving={saving}
          onCreate={handleCreate}
          onClose={() => {
            setOpen(false);
            setInitial(null);
          }}
        />
      )}

      {loading ? (
        <Card>
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        </Card>
      ) : error ? (
        <Card>
          <Text className="text-destructive">{error}</Text>
        </Card>
      ) : activities.length === 0 ? (
        <Card>
          <Text variant="muted" className="text-center">
            No activities yet. Add one above, or turn a local idea into one.
          </Text>
        </Card>
      ) : (
        activities.map((a) => (
          <Pressable key={a.id} onPress={() => router.push(`/activity/${a.id}`)}>
            <Card className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="font-semibold" numberOfLines={1}>
                  {a.title}
                </Text>
                <Text variant="muted" className="text-xs" numberOfLines={1}>
                  {a.scheduled_for
                    ? formatDate(a.scheduled_for.slice(0, 10))
                    : "Anytime"}
                  {a.location ? ` · ${a.location}` : ""}
                </Text>
              </View>
              <Text variant="muted">›</Text>
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );
}
