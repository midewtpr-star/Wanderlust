import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";
import { SKINS, type Skin } from "@/constants/skins";
import { useTheme } from "@/lib/theme-provider";
import { SkinScope } from "@/lib/skin";

// A live mini-mockup of the SAME screen, rendered in a given skin (real LA-trip
// example content). Tokens/type/radius resolve to that skin via SkinScope.
function Preview({ skin }: { skin: Skin }) {
  return (
    <SkinScope skin={skin}>
      <View
        className="overflow-hidden rounded-xl border border-border bg-background"
        style={{ height: 148 }}
      >
        <View className="border-b border-border bg-secondary px-3 py-2">
          <Text variant="heading" numberOfLines={1}>
            Los Angeles
          </Text>
          <Text variant="caption" numberOfLines={1}>
            Aug 18–23 · 20 going
          </Text>
        </View>
        <View className="flex-1 gap-2 p-3">
          <Text variant="muted" numberOfLines={2}>
            House outside the city · 3 rental cars
          </Text>
          <View className="mt-auto flex-row items-center gap-2">
            <View className="rounded-full border border-primary bg-accent-fill px-2.5 py-1">
              <Text
                className="text-[11px] text-primary-foreground"
                style={{ fontFamily: fontFamily("semibold") }}
              >
                Verified
              </Text>
            </View>
            <View className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <View className="h-2 w-2/3 rounded-full border border-primary bg-accent-fill" />
            </View>
          </View>
        </View>
      </View>
    </SkinScope>
  );
}

// The skin picker (Settings). Three large live previews so the choice is visual.
// Skin applies globally to this user, independent of light/dark + destination theme.
export function SkinPicker() {
  const { skin, setSkin } = useTheme();
  return (
    <Card className="gap-4">
      <View className="gap-1">
        <Text variant="heading">App skin</Text>
        <Text variant="muted">
          Pick your look — same features, three personalities. Applies across the
          whole app.
        </Text>
      </View>

      <View className="gap-3">
        {SKINS.map((s) => {
          const active = skin === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => setSkin(s.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${s.name} skin${active ? ", selected" : ""}`}
              className={cn(
                "gap-2 rounded-2xl border-2 p-2 active:opacity-90",
                active ? "border-primary" : "border-border",
              )}
            >
              <Preview skin={s.id} />
              <View className="flex-row items-center justify-between px-1">
                <View className="flex-1 pr-2">
                  <Text variant="heading">{s.name}</Text>
                  <Text variant="caption" numberOfLines={1}>
                    {s.tagline}
                  </Text>
                </View>
                {active ? (
                  <Text
                    className="text-primary"
                    style={{ fontFamily: fontFamily("semibold") }}
                  >
                    Selected ✓
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
