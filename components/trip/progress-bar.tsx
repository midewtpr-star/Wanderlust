import { View } from "react-native";
import { useTheme } from "@/lib/theme-provider";
import { accentForScheme, NEUTRALS } from "@/constants/theme";

// Simple horizontal progress bar. Inline styles (NativeWind className isn't wired
// onto arbitrary style props here); the fill uses the accent by default.
export function ProgressBar({
  fraction,
  height = 10,
  filled,
  track,
}: {
  fraction: number;
  height?: number;
  filled?: string;
  track?: string;
}) {
  const { accent, scheme } = useTheme();
  const fill = filled ?? accentForScheme(accent, scheme);
  const trackColor = track ?? NEUTRALS[scheme].border;
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: trackColor,
        overflow: "hidden",
      }}
    >
      <View
        style={{ width: `${pct}%`, height: "100%", backgroundColor: fill }}
      />
    </View>
  );
}
