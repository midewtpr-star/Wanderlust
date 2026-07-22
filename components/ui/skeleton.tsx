import { useEffect, useRef } from "react";
import { Animated, type DimensionValue, type ViewStyle } from "react-native";

// Pulsing placeholder box for loading states. Uses a neutral slate tint (with
// animated opacity) so it reads fine in light + dark without theme wiring.
export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(v, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [v]);

  const backgroundColor = v.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(148,163,184,0.20)", "rgba(148,163,184,0.45)"],
  });

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor }, style]}
    />
  );
}
