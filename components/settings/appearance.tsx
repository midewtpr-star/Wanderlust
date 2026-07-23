import { useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/lib/theme-provider";
import {
  ACCENT_PRESETS,
  accentForScheme,
  isValidHex,
  normalizeHex,
  NEUTRALS,
  type ThemeMode,
} from "@/constants/theme";
import { cn } from "@/lib/utils";

const MODES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

function Swatch({
  color,
  label,
  selected,
  ringColor,
  onPress,
}: {
  color: string;
  label: string;
  selected: boolean;
  ringColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="items-center gap-1" style={{ width: 60 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: selected ? 3 : 0,
          borderColor: ringColor,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: color,
            borderWidth: 1,
            borderColor: "rgba(120,120,128,0.4)",
          }}
        />
      </View>
      <Text variant="caption">{label}</Text>
    </Pressable>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <View
      className={cn(
        "h-6 w-11 justify-center rounded-full px-0.5",
        on ? "border border-primary bg-accent-fill" : "bg-secondary",
      )}
    >
      <View
        className={cn(
          "h-5 w-5 rounded-full bg-background",
          on ? "self-end" : "self-start",
        )}
      />
    </View>
  );
}

// Appearance settings: Light / Dark / System + accent presets and a custom hex.
// Changes apply live (ThemeProvider recolors the app) and persist.
export function AppearanceSettings() {
  const { mode, accent, scheme, setMode, setAccent, forceOwnAccent, setForceOwnAccent } =
    useTheme();
  const [customOpen, setCustomOpen] = useState(false);
  const [hex, setHex] = useState(accent);

  const isPreset = ACCENT_PRESETS.some(
    (p) => p.light.toLowerCase() === accent.toLowerCase(),
  );

  function onCustomChange(text: string) {
    setHex(text);
    if (isValidHex(text)) setAccent(normalizeHex(text)); // live preview
  }

  return (
    <Card className="gap-5">
      <Text variant="heading">Appearance</Text>

      <View className="gap-2">
        <Text variant="muted">Theme</Text>
        <View className="flex-row gap-2">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMode(m.id)}
                className={cn(
                  "flex-1 items-center rounded-xl border py-2.5",
                  active
                    ? "border-primary bg-accent-fill"
                    : "border-border bg-secondary",
                )}
              >
                <Text
                  className={cn(
                    "text-[15px] font-semibold",
                    active ? "text-primary-foreground" : "text-foreground",
                  )}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-3">
        <Text variant="muted">Accent</Text>
        <View className="flex-row flex-wrap gap-4">
          {ACCENT_PRESETS.map((p) => (
            <Swatch
              key={p.id}
              color={accentForScheme(p.light, scheme)}
              label={p.name}
              ringColor={NEUTRALS[scheme].text}
              selected={
                !customOpen && accent.toLowerCase() === p.light.toLowerCase()
              }
              onPress={() => {
                setCustomOpen(false);
                setAccent(p.light);
              }}
            />
          ))}
          <Swatch
            color={isPreset ? "#8E8E93" : accent}
            label="Custom"
            ringColor={NEUTRALS[scheme].text}
            selected={customOpen || !isPreset}
            onPress={() => {
              setHex(accent);
              setCustomOpen(true);
            }}
          />
        </View>

        {customOpen ? (
          <View className="gap-2">
            <Text variant="caption">Enter any hex color</Text>
            <Input
              value={hex}
              onChangeText={onCustomChange}
              placeholder="#RRGGBB"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        ) : null}
      </View>

      <View className="gap-2">
        <Text variant="muted">Destination themes</Text>
        <Pressable
          onPress={() => setForceOwnAccent(!forceOwnAccent)}
          accessibilityRole="switch"
          accessibilityState={{ checked: forceOwnAccent }}
          className="flex-row items-center justify-between"
        >
          <View className="flex-1 pr-3">
            <Text>Always use my own accent</Text>
            <Text variant="caption">
              On = keep your accent everywhere and ignore each trip&apos;s
              destination theme.
            </Text>
          </View>
          <Toggle on={forceOwnAccent} />
        </Pressable>
      </View>
    </Card>
  );
}
