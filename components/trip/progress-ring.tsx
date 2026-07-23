import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useEffectiveAccent } from "@/lib/trip-theme";
import { NEUTRALS } from "@/constants/theme";

// Circular progress ring (react-native-svg — works on web + native). Starts at
// 12 o'clock. The fill uses the visible accent ink (SVG can't take NativeWind).
export function ProgressRing({
  fraction,
  size = 128,
  stroke = 12,
  filled,
  track,
  children,
}: {
  fraction: number;
  size?: number;
  stroke?: number;
  filled?: string;
  track?: string;
  children?: ReactNode;
}) {
  const { ink, scheme } = useEffectiveAccent();
  const fill = filled ?? ink;
  const trackColor = track ?? NEUTRALS[scheme].border;
  const clamped = Math.max(0, Math.min(1, fraction));
  const c = size / 2;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={c} cy={c} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={fill}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        {children}
      </View>
    </View>
  );
}
