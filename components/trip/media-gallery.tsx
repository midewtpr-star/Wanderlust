import { View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoItem } from "./video-item";
import type { MediaWithUrl } from "@/hooks/use-activity-media";

// Mixed-media gallery for an activity: photo thumbnails + inline video players,
// each with its caption. Uploaders can delete their OWN items.
export function MediaGallery({
  media,
  currentUserId,
  onRemove,
}: {
  media: MediaWithUrl[];
  currentUserId: string;
  onRemove: (mediaId: string, path: string | null) => void;
}) {
  if (media.length === 0) {
    return (
      <Card>
        <Text variant="muted" className="text-center">
          No photos or videos yet. Add the first one above.
        </Text>
      </Card>
    );
  }

  return (
    <View className="gap-3">
      {media.map((m) => {
        const mine = m.uploaded_by === currentUserId;
        return (
          <Card key={m.id} className="gap-2">
            {m.media_type === "video" ? (
              <VideoItem uri={m.signedUrl} />
            ) : m.signedUrl ? (
              <Image
                source={{ uri: m.signedUrl }}
                style={{ width: "100%", height: 220, borderRadius: 10 }}
                contentFit="cover"
              />
            ) : (
              <View className="h-40 w-full items-center justify-center rounded-lg bg-muted">
                <Text variant="muted" className="text-xs">
                  Unavailable
                </Text>
              </View>
            )}
            {m.caption ? <Text>{m.caption}</Text> : null}
            {mine ? (
              <Button
                label="Delete"
                variant="outline"
                size="sm"
                onPress={() => onRemove(m.id, m.url)}
              />
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}
