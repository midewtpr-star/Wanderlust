import { View, type ViewStyle, type StyleProp } from "react-native";
import { useTheme } from "@/lib/theme-provider";
import type { ShadowSpec } from "@/constants/design-tokens";

// The Collage skin's hard offset shadow (e.g. `3px 3px 0`). RN's native shadow is
// always blurred, so we render a DUPLICATE, offset, solid layer behind the child —
// keeping a crisp hard edge identically on iOS, Android and web.
//
// Pass `shadow` to force a spec (dev harness); otherwise it reads the current
// skin's token (null for editorial/poster → renders children with no shadow).
export function HardShadow({
  children,
  radius,
  shadow,
  style,
}: {
  children: React.ReactNode;
  radius?: number;
  shadow?: ShadowSpec;
  style?: StyleProp<ViewStyle>;
}) {
  const ctx = useTheme();
  const spec = shadow !== undefined ? shadow : ctx.tokens.shadow;
  const r = radius ?? ctx.tokens.radius;

  if (!spec) return <View style={style}>{children}</View>;

  return (
    <View style={style}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: spec.dx,
          top: spec.dy,
          width: "100%",
          height: "100%",
          backgroundColor: spec.color,
          borderRadius: r,
        }}
      />
      {children}
    </View>
  );
}
