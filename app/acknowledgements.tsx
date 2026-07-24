import { View, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";

// Open-source acknowledgements. The five per-skin display faces + Inter are
// bundled with the app, all under the SIL Open Font License 1.1, which requires
// the copyright notice + licence to ship with the software — this screen carries
// them. (Apple system fonts / SF Pro are NOT bundled.)
const FONTS: { name: string; holder: string }[] = [
  { name: "Inter", holder: "Copyright © The Inter Project Authors (https://github.com/rsms/inter)" },
  { name: "Playfair Display", holder: "Copyright © Claus Eggers Sørensen" },
  { name: "Anton", holder: "Copyright © Vernon Adams (https://github.com/vernnobile)" },
  { name: "Archivo", holder: "Copyright © Omnibus-Type" },
  { name: "Space Mono", holder: "Copyright © Colophon Foundry" },
  { name: "Great Vibes", holder: "Copyright © TypeSETit, LLC" },
];

const OFL =
  "This Font Software is licensed under the SIL Open Font License, Version 1.1. " +
  "The font software is provided “as is”, without warranty of any kind. " +
  "You may use, study, copy, merge, embed, modify and redistribute it under the terms of the OFL; " +
  "the fonts and derivatives may not be sold on their own, and the OFL text and copyright notice " +
  "must accompany any distribution. Full licence: https://scripts.sil.org/OFL";

export default function AcknowledgementsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Acknowledgements", headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 18 }}>
        <View className="gap-1">
          <Text variant="display-lg">Acknowledgements</Text>
          <Text variant="muted">The typefaces Trippl ships with, and their licences.</Text>
        </View>

        <View className="gap-2">
          <Text variant="heading">Fonts — SIL Open Font License 1.1</Text>
          <Card className="gap-2">
            {FONTS.map((f) => (
              <View key={f.name} className="gap-0.5">
                <Text style={{ fontWeight: "700" }}>{f.name}</Text>
                <Text variant="muted" className="text-xs">
                  {f.holder}
                </Text>
              </View>
            ))}
          </Card>
        </View>

        <Card>
          <Text variant="muted" className="text-xs">
            {OFL}
          </Text>
        </Card>

        <Text variant="caption">
          Apple’s San Francisco / SF Pro is not bundled — Apple devices render the system font, and other
          platforms fall back to Inter.
        </Text>
      </ScrollView>
    </View>
  );
}
