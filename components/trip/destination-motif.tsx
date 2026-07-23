import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Rect,
  Line,
  Circle,
  Path,
  Polyline,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { useTripThemeCtx } from "@/lib/trip-theme";

// Map a motif key to a simple pattern family.
function family(motif: string): "rays" | "peaks" | "dots" | "waves" | "plain" {
  switch (motif) {
    case "artdeco":
      return "rays";
    case "alpine":
    case "mountain":
    case "desert":
      return "peaks";
    case "citynight":
    case "jazz":
    case "vineyard":
      return "dots";
    case "tropical":
    case "coastal":
    case "rainforest":
      return "waves";
    default:
      return "plain"; // historic → gradient wash only
  }
}

const DOTS: [number, number, number][] = [
  [12, 14, 0.8],
  [30, 9, 0.6],
  [46, 16, 0.7],
  [64, 10, 0.6],
  [80, 15, 0.9],
  [90, 8, 0.6],
  [22, 24, 0.6],
  [56, 26, 0.7],
  [74, 24, 0.6],
];

function Pattern({ motif, color }: { motif: string; color: string }) {
  switch (family(motif)) {
    case "rays":
      return (
        <>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Line
              key={i}
              x1={100}
              y1={0}
              x2={100 - 15 * i}
              y2={60}
              stroke={color}
              strokeWidth={0.6}
              opacity={0.4}
            />
          ))}
        </>
      );
    case "peaks":
      return (
        <Polyline
          points="0,60 12,45 24,58 40,39 56,57 72,43 88,58 100,47 100,60 0,60"
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.45}
        />
      );
    case "dots":
      return (
        <>
          {DOTS.map((d, i) => (
            <Circle key={i} cx={d[0]} cy={d[1]} r={d[2]} fill={color} opacity={0.5} />
          ))}
        </>
      );
    case "waves":
      return (
        <>
          {[40, 48, 56].map((y, i) => (
            <Path
              key={i}
              d={`M0 ${y} Q 12.5 ${y - 4} 25 ${y} T 50 ${y} T 75 ${y} T 100 ${y}`}
              fill="none"
              stroke={color}
              strokeWidth={0.8}
              opacity={0.4}
            />
          ))}
        </>
      );
    default:
      return null;
  }
}

// A restrained, animated decorative overlay for the trip header, themed to the
// destination. Fades + rises in on mount so entering a trip feels intentional.
// Renders nothing unless a destination theme is applied. pointerEvents: none.
export function DestinationMotif() {
  const t = useTripThemeCtx();
  const op = useSharedValue(0);
  const ty = useSharedValue(10);

  useEffect(() => {
    op.value = withTiming(1, { duration: 620 });
    ty.value = withSpring(0, { damping: 14, stiffness: 90 });
  }, [op, ty]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  if (!t?.applied || !t.theme) return null;
  const theme = t.theme;
  const patternColor = t.ink ?? theme.primary;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="destWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.secondary} stopOpacity={0} />
            <Stop offset="1" stopColor={theme.secondary} stopOpacity={0.34} />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={60} fill="url(#destWash)" />
        <Pattern motif={theme.motif} color={patternColor} />
      </Svg>
    </Animated.View>
  );
}
