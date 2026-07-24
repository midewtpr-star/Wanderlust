import { createContext, useContext, type ReactNode } from "react";
import { View } from "react-native";
import { vars } from "nativewind";
import { useTheme } from "@/lib/theme-provider";
import { resolveAccentVars } from "@/constants/theme";
import { useTripTheme } from "@/hooks/use-trip-theme";

type TripThemeValue = ReturnType<typeof useTripTheme>;
const TripThemeContext = createContext<TripThemeValue | null>(null);

// Wraps a trip-scoped screen. When the trip has an APPLIED destination theme this
// overrides the accent CSS variables for the subtree — so every class-based accent
// consumer (buttons, chips, send button, badges, progress fills) recolors — and
// shares the full theme state via context (so the trip detail can regenerate /
// toggle and the wrapper re-themes live). Global chrome never wraps, so it stays
// neutral Trippl.
export function TripThemeProvider({
  tripId,
  children,
}: {
  tripId: string | undefined;
  children: ReactNode;
}) {
  const t = useTripTheme(tripId);
  const style =
    t.applied && t.ink && t.fill && t.fg
      ? vars({
          "--accent": t.ink,
          "--accent-fill": t.fill,
          "--accent-fg": t.fg,
        })
      : null;
  return (
    <TripThemeContext.Provider value={t}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </TripThemeContext.Provider>
  );
}

// The shared trip-theme state (theme, applied, refresh, setUsePref) for the theme
// controls + lazy generation. Null outside a TripThemeProvider.
export function useTripThemeCtx(): TripThemeValue | null {
  return useContext(TripThemeContext);
}

// The accent for JS / SVG / inline-style colors: the trip's destination accent
// when inside a themed trip, else the user's global accent. Class-based consumers
// read the CSS vars directly (overridden by TripThemeProvider) and don't need this.
export function useEffectiveAccent(): {
  ink: string;
  fill: string;
  fg: string;
  scheme: "light" | "dark";
} {
  const t = useContext(TripThemeContext);
  const { accent, scheme } = useTheme();
  if (t?.applied && t.ink && t.fill && t.fg) {
    return { ink: t.ink, fill: t.fill, fg: t.fg, scheme };
  }
  const { fill, ink, fg } = resolveAccentVars(accent, scheme);
  return { ink, fill, fg, scheme };
}
