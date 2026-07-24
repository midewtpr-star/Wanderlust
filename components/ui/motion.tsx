import { useEffect, useState, type ReactNode } from "react";
import {
  View,
  StyleSheet,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

// Trippl motion library — the design system's keyframes ported to Reanimated
// (docs/design.md → Motion). Every animation respects the OS "reduce motion"
// setting via useReducedMotion(): looping/decorative motion is dropped and
// entrance animations snap to their final state, so nothing essential is lost.
//
// Ported keyframes: pop · badgeIn · ringPulse · confFall · scanLine · shimmer ·
// floaty · fadeUp · spin.

export { useReducedMotion };

const OVERSHOOT = Easing.bezier(0.2, 1.3, 0.4, 1); // badge/step spring feel

// --- pop: scale 0 → 1.25 → 1 (a checkmark landing). ------------------------
export function Pop({
  children,
  style,
  duration = 400,
  from = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
  from?: number;
}) {
  const reduce = useReducedMotion();
  const s = useSharedValue(reduce ? 1 : from);
  useEffect(() => {
    if (reduce) {
      s.value = 1;
      return;
    }
    s.value = withSequence(
      withTiming(1.25, { duration: duration * 0.6, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: duration * 0.4, easing: Easing.inOut(Easing.quad) }),
    );
    return () => cancelAnimation(s);
  }, [reduce, duration, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

// --- badgeIn: scale 0→1.16→1, rotate -22→7→0, fade in (the verified badge). --
export function BadgeIn({
  children,
  style,
  duration = 700,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      p.value = 1;
      return;
    }
    p.value = withTiming(1, { duration, easing: OVERSHOOT });
    return () => cancelAnimation(p);
  }, [reduce, duration, p]);
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.4], [0, 1], "clamp"),
    transform: [
      { scale: p.value }, // OVERSHOOT drives the >1 pop, settling to 1
      { rotate: `${interpolate(p.value, [0, 1], [-22, 0])}deg` },
    ],
  }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

// --- ringPulse: an expanding, fading ring behind a badge (loops). ----------
export function RingPulse({
  color,
  size = 100,
  borderWidth = 3,
  duration = 1600,
  style,
}: {
  color: string;
  size?: number;
  borderWidth?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    p.value = withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(p);
  }, [reduce, duration, p]);
  const st = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - p.value),
    transform: [{ scale: 0.55 + p.value * 1.45 }],
  }));
  if (reduce) return null; // decorative — safe to drop
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: color,
        },
        st,
        style,
      ]}
    />
  );
}

// --- confFall: 16 falling confetti pieces (the verified celebration). ------
const CONF_COLORS = ["#FF2E93", "#2547C6", "#34C759", "#FFCC00", "#AF52DE"];

function ConfettiPiece({ i }: { i: number }) {
  const left = (i * 6.1 + (i % 3) * 5) % 98;
  const delay = (i % 6) * 50;
  const dur = (0.9 + (i % 4) * 0.18) * 1000;
  const color = CONF_COLORS[i % 5];
  const size = 6 + (i % 3) * 4;
  const rot0 = i * 37;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: dur, easing: Easing.in(Easing.quad) }), -1, false),
    );
    return () => cancelAnimation(p);
  }, [p, delay, dur]);
  const st = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateY: -14 + p.value * 274 },
      { rotate: `${rot0 + p.value * 400}deg` },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", top: 0, left: `${left}%`, width: size, height: size * 1.4, borderRadius: 1, backgroundColor: color },
        st,
      ]}
    />
  );
}

export function Confetti({ count = 16 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null; // pure celebration ornament
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => (
        <ConfettiPiece key={i} i={i} />
      ))}
    </View>
  );
}

// --- scanLine: a glowing line sweeping top→bottom (the itinerary scan). -----
export function ScanLine({ color, height = 3 }: { color: string; height?: number }) {
  const reduce = useReducedMotion();
  const [h, setH] = useState(0);
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce || h === 0) return;
    p.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(p);
  }, [reduce, h, p]);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(p.value, [0, 1], [0.02 * h, 0.96 * h]) }],
  }));
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setH(e.nativeEvent.layout.height)}
    >
      {reduce ? null : (
        <Animated.View
          style={[
            { position: "absolute", left: 0, right: 0, height, backgroundColor: color, shadowColor: color, shadowOpacity: 0.7, shadowRadius: 8, elevation: 4 },
            st,
          ]}
        />
      )}
    </View>
  );
}

// --- shimmer: a sweeping gradient across a placeholder (skeletons). ---------
export function Shimmer({
  width,
  height,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce || w === 0) return;
    p.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [reduce, w, p]);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(p.value, [0, 1], [-w, w]) }],
  }));
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        { width, height, borderRadius: radius, overflow: "hidden", backgroundColor: "rgba(148,163,184,0.22)" },
        style,
      ]}
    >
      {reduce ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, st]}>
          <LinearGradient
            colors={["rgba(148,163,184,0)", "rgba(148,163,184,0.35)", "rgba(148,163,184,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

// --- floaty: a gentle bob + tilt (collage stickers). -----------------------
export function Floaty({
  children,
  style,
  duration = 6000,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    p.value = withRepeat(withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(p);
  }, [reduce, duration, p]);
  const st = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(p.value, [0, 1], [0, -5]) },
      { rotate: `${interpolate(p.value, [0, 1], [-2, 2])}deg` },
    ],
  }));
  return <Animated.View style={[style, reduce ? { transform: [{ rotate: "-2deg" }] } : st]}>{children}</Animated.View>;
}

// --- fadeUp: rise + fade in (result panels, revealed rows). -----------------
export function FadeUp({
  children,
  style,
  duration = 400,
  delay = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      p.value = 1;
      return;
    }
    p.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
    return () => cancelAnimation(p);
  }, [reduce, duration, delay, p]);
  const st = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: interpolate(p.value, [0, 1], [10, 0]) }],
  }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

// --- spin: a continuous rotation (inline loading spinner). ------------------
export function Spinner({ color, size = 16, borderWidth = 2 }: { color: string; size?: number; borderWidth?: number }) {
  const reduce = useReducedMotion();
  const r = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    r.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(r);
  }, [reduce, r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: "rgba(148,163,184,0.35)",
          borderTopColor: color,
        },
        reduce ? undefined : st,
      ]}
    />
  );
}
