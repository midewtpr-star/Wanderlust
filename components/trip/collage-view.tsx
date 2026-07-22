import { View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/text";

// A styled photo collage built on-device from real trip photos. This is the view
// captured to an image (react-native-view-shot) for the recap. Handles few/no
// photos gracefully.
//
// TODO (Phase 2 — video montage, D9): this capture-a-styled-view surface is
// exactly where the animated "Trip Wrapped" montage will plug in — render frames
// here and encode them server-side instead of a single-frame collage.
export function CollageView({ photos }: { photos: string[] }) {
  const shown = photos.slice(0, 6);

  if (shown.length === 0) {
    return (
      <View className="h-40 w-full items-center justify-center rounded-xl bg-muted">
        <Text variant="muted" className="text-center text-sm">
          No photos yet — add some to your activities for a photo collage.
        </Text>
      </View>
    );
  }

  if (shown.length === 1) {
    return (
      <Image
        source={{ uri: shown[0] }}
        style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 12 }}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
      }}
    >
      {shown.map((uri, i) => (
        <Image
          key={i}
          source={{ uri }}
          style={{
            width: "49%",
            aspectRatio: 1,
            borderRadius: 8,
            marginBottom: "2%",
          }}
          contentFit="cover"
        />
      ))}
    </View>
  );
}
