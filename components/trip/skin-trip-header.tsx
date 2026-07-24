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
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { useSkin } from "@/lib/skin";
import { useTripThemeCtx } from "@/lib/trip-theme";
import { DestinationMotif } from "@/components/trip/destination-motif";
import { SKIN_SIGNATURE } from "@/constants/skins";

const FILL = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

// Field colors for the hero: the destination palette when applied, else the skin's
// signature pair. (This is how the destination system drives collage gradient
// zones + poster color fields — main brief, Section 13.)
function useFields(skin: "collage" | "poster") {
  const t = useTripThemeCtx();
  const sig = SKIN_SIGNATURE[skin];
  const a = (t?.applied && t.theme?.primary) || sig.a;
  const b = (t?.applied && t.theme?.secondary) || sig.b;
  return { a, b };
}

// Collage: faint graph-paper grid + a color wash + a scrap of "tape".
function CollageOverlay() {
  const { a, b } = useFields("collage");
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withTiming(1, { duration: 520 });
  }, [op]);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  const lines = [];
  for (let x = 10; x < 100; x += 10) {
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={60} stroke={a} strokeWidth={0.25} opacity={0.22} />);
  }
  for (let y = 10; y < 60; y += 10) {
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={100} y2={y} stroke={a} strokeWidth={0.25} opacity={0.22} />);
  }
  return (
    <Animated.View pointerEvents="none" style={[FILL, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="colWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={b} stopOpacity={0} />
            <Stop offset="1" stopColor={b} stopOpacity={0.42} />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={60} fill="url(#colWash)" />
        {lines}
        <Rect x={4} y={3} width={17} height={5} fill="#FFFFFF" opacity={0.5} transform="rotate(-8 12 5)" />
      </Svg>
    </Animated.View>
  );
}

// Poster: a bold color field that wipes up from the bottom + a corner wedge.
function PosterOverlay() {
  const { a } = useFields("poster");
  const op = useSharedValue(0);
  const tx = useSharedValue(-16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 520 });
    tx.value = withSpring(0, { damping: 15, stiffness: 90 });
  }, [op, tx]);
  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateX: tx.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[FILL, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="posField" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={a} stopOpacity={0.74} />
            <Stop offset="0.55" stopColor={a} stopOpacity={0.3} />
            <Stop offset="1" stopColor={a} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={60} fill="url(#posField)" />
        <Path d="M0 60 L 24 60 L 0 38 Z" fill={a} opacity={0.4} />
      </Svg>
    </Animated.View>
  );
}

// Skin-aware trip-header ornament (over the cover). Editorial keeps the quiet
// destination motif; Collage + Poster express their signature on this hero surface.
// Dense screens (chat, money, forms) carry no ornament — only the token/type layer.
export function SkinTripHeader() {
  const { skin } = useSkin();
  if (skin === "collage") return <CollageOverlay />;
  if (skin === "poster") return <PosterOverlay />;
  return <DestinationMotif />;
}
