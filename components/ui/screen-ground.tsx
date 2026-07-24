import { View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import Svg, { Defs, Pattern, Path, Rect } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/theme-provider";
import type { ThemeTokens } from "@/constants/design-tokens";

// Split an "rgba(r,g,b,a)" string into an svg-friendly {color, opacity}.
function rgbaParts(s: string): { color: string; opacity: number } {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return { color: s, opacity: 1 };
  const p = m[1].split(",").map((x) => x.trim());
  return {
    color: `rgb(${p[0]},${p[1]},${p[2]})`,
    opacity: p[3] !== undefined ? parseFloat(p[3]) : 1,
  };
}

// The per-skin screen background, re-expressed for React Native:
//   · editorial → a solid neutral bg.
//   · poster    → the solid cobalt field.
//   · collage   → a graph-paper grid (a tiled react-native-svg <Pattern>, so it
//     tiles seamlessly and themes with the mode) under a pink gradient wash
//     (expo-linear-gradient). Layer order matches the design's CSS: base → grid → wash.
// Content renders above the ground. Pass `tokens` to force a combination (dev
// harness); otherwise it reads the live theme.
export function ScreenGround({
  children,
  style,
  tokens,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tokens?: ThemeTokens;
}) {
  const ctx = useTheme();
  const t = tokens ?? ctx.tokens;
  const g = t.ground;
  const baseColor = g.kind === "grid" ? g.base : g.color;

  return (
    <View style={[{ flex: 1 }, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: baseColor }]} />
        {g.kind === "grid" ? (
          <>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <Pattern
                  id="trippl-grid"
                  width={g.cell}
                  height={g.cell}
                  patternUnits="userSpaceOnUse"
                >
                  <Path
                    d={`M ${g.cell} 0 L 0 0 0 ${g.cell}`}
                    fill="none"
                    stroke={rgbaParts(g.line).color}
                    strokeOpacity={rgbaParts(g.line).opacity}
                    strokeWidth={1}
                  />
                </Pattern>
              </Defs>
              <Rect x={0} y={0} width="100%" height="100%" fill="url(#trippl-grid)" />
            </Svg>
            <LinearGradient
              colors={g.wash.colors}
              locations={g.wash.locations}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : null}
      </View>
      {children}
    </View>
  );
}
