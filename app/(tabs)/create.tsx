import { useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { CoverPicker } from "@/components/create/cover-picker";
import { AirbnbOptionsEditor } from "@/components/create/airbnb-options-editor";
import { useAuth } from "@/lib/auth-provider";
import { useCreateTrip } from "@/hooks/use-create-trip";
import { toISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { AirbnbOptionInput } from "@/types";

const STEP_TITLES = ["Basics", "Where & when", "Car rental", "Airbnb options", "Review"];

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { createTrip, submitting, error } = useCreateTrip();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [carRef, setCarRef] = useState("");
  const [options, setOptions] = useState<AirbnbOptionInput[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const datesValid = !!start && !!end && end.getTime() >= start.getTime();
  const basicsValid = title.trim().length > 0;
  const whereValid = city.trim().length > 0 && datesValid;
  const stepValid = [basicsValid, whereValid, true, true, basicsValid && whereValid][step];
  const isLast = step === STEP_TITLES.length - 1;

  async function submit() {
    if (!user) {
      setLocalError("You must be signed in.");
      return;
    }
    if (!start || !end) return;
    setLocalError(null);
    const trip = await createTrip(
      {
        title,
        cover_url: coverUrl,
        location_city: city,
        start_date: toISODate(start),
        end_date: toISODate(end),
        car_rental_ref: carRef,
        airbnb_options: options,
      },
      user.id,
    );
    if (trip) router.replace(`/trip/${trip.id}`);
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-6 pb-2 pt-4">
        <Text variant="title">Create a trip</Text>
        <View className="mt-3 flex-row gap-1">
          {STEP_TITLES.map((t, i) => (
            <View
              key={t}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </View>
        <Text variant="muted" className="mt-2">
          Step {step + 1} of {STEP_TITLES.length} · {STEP_TITLES[step]}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerClassName="gap-4 p-6"
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 ? (
            <>
              <View className="gap-1">
                <Label>Trip title</Label>
                <Input
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Spring break in Austin"
                />
              </View>
              <View className="gap-1">
                <Label>Cover photo</Label>
                {user ? (
                  <CoverPicker
                    userId={user.id}
                    coverUrl={coverUrl}
                    onUploaded={setCoverUrl}
                  />
                ) : null}
              </View>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <View className="gap-1">
                <Label>Destination city</Label>
                <Input value={city} onChangeText={setCity} placeholder="Austin, TX" />
                <Text variant="muted" className="text-xs">
                  We&apos;ll add map coordinates later for flight check-in.
                </Text>
              </View>
              <View className="gap-1">
                <Label>Start date</Label>
                <DateField value={start} onChange={setStart} placeholder="Start date" />
              </View>
              <View className="gap-1">
                <Label>End date</Label>
                <DateField
                  value={end}
                  onChange={setEnd}
                  placeholder="End date"
                  minimumDate={start ?? undefined}
                />
              </View>
              {start && end && !datesValid ? (
                <Text className="text-destructive">
                  End date must be on or after the start date.
                </Text>
              ) : null}
            </>
          ) : null}

          {step === 2 ? (
            <View className="gap-1">
              <Label>Car rental (optional)</Label>
              <Input
                value={carRef}
                onChangeText={setCarRef}
                placeholder="Rental link or confirmation #"
                autoCapitalize="none"
              />
              <Text variant="muted" className="text-xs">
                Paste a booking link or a confirmation number.
              </Text>
            </View>
          ) : null}

          {step === 3 ? (
            <View className="gap-2">
              <Text variant="muted">
                Add Airbnb options for the group to consider. Voting comes later.
              </Text>
              <AirbnbOptionsEditor options={options} onChange={setOptions} />
            </View>
          ) : null}

          {step === 4 ? (
            <View className="gap-3">
              <Text variant="heading">Review</Text>
              <ReviewRow label="Title" value={title || "—"} />
              <ReviewRow label="Destination" value={city || "—"} />
              <ReviewRow
                label="Dates"
                value={start && end ? `${toISODate(start)} → ${toISODate(end)}` : "—"}
              />
              <ReviewRow label="Cover" value={coverUrl ? "Added ✓" : "None"} />
              <ReviewRow label="Car rental" value={carRef.trim() || "None"} />
              <ReviewRow label="Airbnb options" value={`${options.length} added`} />
              {error || localError ? (
                <Text className="text-destructive">{error ?? localError}</Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        className="flex-row gap-3 border-t border-border p-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {step > 0 ? (
          <Button
            label="Back"
            variant="outline"
            className="flex-1"
            onPress={() => setStep((s) => s - 1)}
          />
        ) : null}
        {!isLast ? (
          <Button
            label="Next"
            className={cn("flex-1", !stepValid && "opacity-50")}
            disabled={!stepValid}
            onPress={() => setStep((s) => s + 1)}
          />
        ) : (
          <Button
            label={submitting ? "Creating…" : "Create trip"}
            className={cn("flex-1", submitting && "opacity-70")}
            disabled={submitting}
            onPress={submit}
          />
        )}
      </View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b border-border pb-2">
      <Text variant="muted">{label}</Text>
      <Text className="flex-1 text-right" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
