import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Text } from "@/components/ui/text";
import { formatDate, toISODate } from "@/lib/dates";

// Native date field (iOS/Android). Web uses date-field.web.tsx.
export function DateField({
  value,
  onChange,
  placeholder = "Select date",
  minimumDate,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  placeholder?: string;
  minimumDate?: Date;
}) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setShow(true)}
        className="h-11 w-full justify-center rounded-lg border border-border bg-background px-3 active:opacity-80"
      >
        <Text className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? formatDate(toISODate(value)) : placeholder}
        </Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          minimumDate={minimumDate}
          onChange={(event, d) => {
            setShow(false);
            if (event.type !== "dismissed" && d) onChange(d);
          }}
        />
      ) : null}
    </View>
  );
}
