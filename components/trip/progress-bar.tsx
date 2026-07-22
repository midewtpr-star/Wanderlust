import { View } from "react-native";
import { useTheme } from "@/lib/theme-provider";
import { NEUTRALS } from "@/constants/theme";

// Simple horizontal progress bar. Inline styles (NativeWind className isn't wired
// onto arbitrary style props here); the fill uses the visible accent ink so mono
// accents (Black/White) never vanish.
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
  const { accentInk, scheme } = useTheme();
  const fill = filled ?? accentInk;
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
