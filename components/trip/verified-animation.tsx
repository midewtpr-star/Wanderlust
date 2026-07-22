import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";

// A checkmark that springs in with a small confetti burst, on a verified proof.
// Uses react-native-reanimated (D1). NativeWind className isn't applied to the
// Animated.* wrappers — those use inline styles (NativeWind v4 only auto-wires
// className onto core RN components).

const CONFETTI = [
  { x: -72, y: -44, c: "#22c55e" },
  { x: 70, y: -38, c: "#3b82f6" },
  { x: -54, y: 34, c: "#f59e0b" },
  { x: 58, y: 40, c: "#ec4899" },
  { x: 2, y: -78, c: "#8b5cf6" },
  { x: -8, y: 60, c: "#14b8a6" },
];

function Confetti({
  x,
  y,
  color,
  delay,
}: {
  x: number;
  y: number;
  color: string;
  delay: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      delay,
      withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }),
    );
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: p.value * x },
      { translateY: p.value * y },
      { scale: 1 - p.value * 0.35 },
    ],
    opacity: 1 - p.value,
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function VerifiedAnimation({
  label = "Flight itinerary verified",
}: {
  label?: string;
}) {
  const scale = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.15, { duration: 260, easing: Easing.out(Easing.back(2)) }),
      withSpring(1, { damping: 8, stiffness: 140 }),
    );
    check.value = withDelay(180, withTiming(1, { duration: 240 }));
  }, [scale, check]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: check.value }],
  }));

  return (
    <View className="items-center justify-center gap-4 py-4">
      <View
        style={{
          width: 128,
          height: 128,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {CONFETTI.map((c, i) => (
          <Confetti key={i} x={c.x} y={c.y} color={c.c} delay={220 + i * 45} />
        ))}
        <Animated.View
          style={[
            {
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: "#22c55e",
              alignItems: "center",
              justifyContent: "center",
            },
            circleStyle,
          ]}
        >
          <Animated.Text
            style={[
              { color: "white", fontSize: 52, fontWeight: "800", lineHeight: 60 },
              checkStyle,
            ]}
          >
            ✓
          </Animated.Text>
        </Animated.View>
      </View>
      <Text variant="heading" className="text-center">
        {label}
      </Text>
    </View>
  );
}
