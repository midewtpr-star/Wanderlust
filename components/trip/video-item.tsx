import { View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Text } from "@/components/ui/text";

// A single video with native controls (expo-video → HTML5 <video> on web).
export function VideoItem({ uri }: { uri: string | null }) {
  const player = useVideoPlayer(uri ?? "", (p) => {
    p.loop = false;
  });

  if (!uri) {
    return (
      <View className="h-40 w-full items-center justify-center rounded-lg bg-muted">
        <Text variant="muted" className="text-xs">
          Video unavailable
        </Text>
      </View>
    );
  }

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: 180, borderRadius: 10, backgroundColor: "#000" }}
      nativeControls
      contentFit="contain"
    />
  );
}
