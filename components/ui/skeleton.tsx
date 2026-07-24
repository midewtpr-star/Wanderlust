import { type DimensionValue, type ViewStyle } from "react-native";
import { Shimmer } from "@/components/ui/motion";

// Loading placeholder — a gradient shimmer sweep (design system), matched to the
// final layout. Under "reduce motion" it renders as a static neutral box.
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
  return <Shimmer width={width} height={height} radius={radius} style={style} />;
}
