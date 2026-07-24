import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatDayLabel } from "@/lib/dates";
import type { JournalEntryView } from "@/types";

const THUMB = 64;

// One entry in the journal timeline: author, when, optional day/activity tags, a
// text preview, and a thumbnail strip (up to 4, with a +N overlay). Tap → detail.
export function JournalEntryCard({
  entry,
  activityTitle,
  onPress,
}: {
  entry: JournalEntryView;
  activityTitle: string | null;
  onPress: () => void;
}) {
  const thumbs = entry.media.slice(0, 4);
  const extra = entry.media.length - thumbs.length;
  const photos = entry.media.filter((m) => m.media_type === "photo").length;
  const videos = entry.media.length - photos;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open journal entry"
    >
      <Card className="gap-2 active:opacity-90">
        <View className="flex-row items-center gap-2">
          <Avatar name={entry.author_name} uri={entry.author_avatar} size={24} />
          <Text variant="caption" className="flex-1" numberOfLines={1}>
            {entry.author_name ?? "Member"} · {formatDayLabel(entry.created_at)}
          </Text>
        </View>

        {entry.day || activityTitle ? (
          <View className="flex-row flex-wrap gap-1.5">
            {entry.day ? <Tag label={formatDate(entry.day)} /> : null}
            {activityTitle ? <Tag label={activityTitle} /> : null}
          </View>
        ) : null}

        {entry.body.trim() ? (
          <Text numberOfLines={4}>{entry.body.trim()}</Text>
        ) : null}

        {thumbs.length ? (
          <View className="mt-0.5 flex-row gap-1.5">
            {thumbs.map((m, i) => {
              const isLast = i === thumbs.length - 1 && extra > 0;
              return (
                <View
                  key={m.id}
                  style={{ width: THUMB, height: THUMB }}
                  className="overflow-hidden rounded-lg bg-muted"
                >
                  {m.media_type === "photo" && m.signedUrl ? (
                    <Image
                      source={{ uri: m.signedUrl }}
                      style={{ width: THUMB, height: THUMB }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Text className="text-lg">{m.media_type === "video" ? "🎬" : "🖼"}</Text>
                    </View>
                  )}
                  {isLast ? (
                    <View className="absolute inset-0 items-center justify-center bg-black/50">
                      <Text style={{ color: "#fff" }} className="text-sm">
                        +{extra}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {entry.media.length ? (
          <Text variant="caption">
            {photos ? `${photos} photo${photos === 1 ? "" : "s"}` : ""}
            {photos && videos ? " · " : ""}
            {videos ? `${videos} video${videos === 1 ? "" : "s"}` : ""}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-border bg-secondary px-2 py-0.5">
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
