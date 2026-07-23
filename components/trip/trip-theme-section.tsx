import { useEffect, useRef, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fontFamily, isValidHex, normalizeHex } from "@/constants/theme";
import { useTripThemeCtx } from "@/lib/trip-theme";
import { useGenerateTheme } from "@/hooks/use-trip-theme";
import {
  deriveSecondary,
  deriveTint,
  rgbToHsl,
  hslToRgb,
  hexToRgb,
  rgbToHex,
} from "@/lib/theme-color";
import type { Trip, TripTheme, ThemeSource } from "@/types";

function sourceLabel(s: ThemeSource): string {
  return s === "cover_image" ? "from cover" : s === "curated" ? "curated" : "AI";
}

function Swatch({ color }: { color: string }) {
  return (
    <View
      className="h-8 w-8 rounded-lg border border-border"
      style={{ backgroundColor: color }}
    />
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

// The trip's destination-theme section: auto-generates the theme on first load,
// shows the palette, lets any member opt out for themselves, and lets an admin
// regenerate / pick a variant / set a manual color. Must live INSIDE the trip's
// TripThemeProvider (it reads the shared theme context).
export function TripThemeSection({
  trip,
  isAdmin,
}: {
  trip: Trip;
  isAdmin: boolean;
}) {
  const ctx = useTripThemeCtx();
  const { generate, saveTheme, generating } = useGenerateTheme();
  const [manual, setManual] = useState("");
  const attempted = useRef(false);

  // Lazy: generate + cache the theme once, when the trip has none yet.
  useEffect(() => {
    if (!ctx || attempted.current || !ctx.loaded) return;
    if (ctx.theme === null && (trip.location_city || trip.cover_url)) {
      attempted.current = true;
      (async () => {
        const t = await generate(trip);
        if (t) ctx.refresh();
      })();
    }
  }, [ctx, trip, generate]);

  if (!ctx) return null;
  const theme = ctx.theme;

  async function regenerate() {
    const t = await generate(trip);
    if (t) ctx?.refresh();
  }

  async function applyPrimary(primary: string | null) {
    if (!primary) return;
    const next: TripTheme = {
      primary,
      secondary: deriveSecondary(primary),
      surface_tint: deriveTint(primary),
      motif: theme?.motif ?? "coastal",
      source: "curated",
    };
    await saveTheme(trip.id, next);
    ctx?.refresh();
  }

  // A couple of algorithmic variants (hue-shifted / punchier) of the current primary.
  function variants(): string[] {
    if (!theme) return [];
    const [h, s, l] = rgbToHsl(...hexToRgb(theme.primary));
    const cands = [
      rgbToHex(...hslToRgb((h + 28) % 360, s, l)),
      rgbToHex(...hslToRgb((h + 332) % 360, s, l)),
      rgbToHex(...hslToRgb(h, Math.min(1, s * 1.2), Math.min(0.6, l))),
    ];
    const cur = theme.primary.toUpperCase();
    return [...new Set(cands)].filter((v) => v.toUpperCase() !== cur).slice(0, 3);
  }

  return (
    <View className="gap-2 px-6 pb-4">
      <Text variant="heading">Trip theme</Text>
      <Card className="gap-3">
        {theme ? (
          <View className="flex-row items-center gap-2">
            <Swatch color={theme.primary} />
            <Swatch color={theme.secondary} />
            <Swatch color={theme.surface_tint} />
            <View className="flex-1" />
            <Text variant="caption" className="capitalize">
              {theme.motif} · {sourceLabel(theme.source)}
            </Text>
          </View>
        ) : generating ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator />
            <Text variant="muted">Generating destination theme…</Text>
          </View>
        ) : (
          <Text variant="muted">
            No destination theme yet — it uses your own accent.
          </Text>
        )}

        {/* Per-member opt-out (everyone) */}
        <Pressable
          onPress={() => ctx.setUsePref(!ctx.usePref)}
          accessibilityRole="switch"
          accessibilityState={{ checked: ctx.usePref }}
          className="flex-row items-center justify-between"
        >
          <View className="flex-1 pr-3">
            <Text>Use destination theme</Text>
            <Text variant="caption">
              Off = your own accent for this trip.
            </Text>
          </View>
          <Toggle on={ctx.usePref} />
        </Pressable>

        {/* Admin controls */}
        {isAdmin ? (
          <View className="gap-2 border-t border-border pt-3">
            <View className="flex-row flex-wrap items-center gap-2">
              <Pressable
                onPress={regenerate}
                disabled={generating}
                accessibilityRole="button"
                className={cn(
                  "rounded-lg border border-primary bg-accent-fill px-3 py-2 active:opacity-80",
                  generating ? "opacity-50" : "",
                )}
              >
                <Text
                  className="text-xs text-primary-foreground"
                  style={{ fontFamily: fontFamily("semibold") }}
                >
                  {generating ? "Working…" : "Regenerate"}
                </Text>
              </Pressable>
              {variants().map((v) => (
                <Pressable
                  key={v}
                  onPress={() => applyPrimary(v)}
                  accessibilityRole="button"
                  accessibilityLabel="Use this variant"
                  className="h-9 w-9 rounded-full border border-border active:opacity-80"
                  style={{ backgroundColor: v }}
                />
              ))}
            </View>
            <View className="flex-row items-center gap-2">
              <Input
                value={manual}
                onChangeText={setManual}
                placeholder="#RRGGBB"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1"
              />
              <Pressable
                disabled={!isValidHex(manual)}
                onPress={() => {
                  applyPrimary(normalizeHex(manual));
                  setManual("");
                }}
                accessibilityRole="button"
                className={cn(
                  "rounded-lg border border-border px-3 py-2.5 active:opacity-80",
                  !isValidHex(manual) ? "opacity-40" : "",
                )}
              >
                <Text className="text-xs" style={{ fontFamily: fontFamily("semibold") }}>
                  Set color
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Card>
    </View>
  );
}
