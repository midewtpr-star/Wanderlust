import { View } from "react-native";

// Simple horizontal progress bar. Inline styles (NativeWind className isn't wired
// onto arbitrary style props here); cross-platform safe.
export function ProgressBar({
  fraction,
  height = 10,
  filled = "#22c55e",
  track = "#e5e7eb",
}: {
  fraction: number;
  height?: number;
  filled?: string;
  track?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: track,
        overflow: "hidden",
      }}
    >
      <View
        style={{ width: `${pct}%`, height: "100%", backgroundColor: filled }}
      />
    </View>
  );
}
