import { useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Text } from "@/components/ui/text";
import { uploadTripCover } from "@/lib/storage";

// Pick a cover from the library or camera, upload to `trip-covers`, and report the
// public URL. Shows a preview + an (indeterminate) upload indicator — the Supabase
// JS client doesn't expose byte-level progress, so this is a busy state, not a %.
export function CoverPicker({
  userId,
  coverUrl,
  onUploaded,
}: {
  userId: string;
  coverUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(source: "library" | "camera") {
    setError(null);
    try {
      const perm =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError("Permission was denied.");
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.7,
        base64: true,
        allowsEditing: true,
        aspect: [16, 9],
      };
      const res =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled) return;

      const asset = res.assets[0];
      setLocalPreview(asset.uri);
      setBusy(true);
      const url = await uploadTripCover(asset, userId);
      onUploaded(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const preview = localPreview ?? coverUrl;
  return (
    <View className="gap-2">
      <View className="h-44 w-full overflow-hidden rounded-xl border border-dashed border-border bg-muted">
        {preview ? (
          <Image
            source={{ uri: preview }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text variant="muted">No cover yet</Text>
          </View>
        )}
        {busy ? (
          <View className="absolute inset-0 items-center justify-center bg-black/40">
            <ActivityIndicator color="#ffffff" />
            <Text className="mt-2 text-white">Uploading…</Text>
          </View>
        ) : null}
        {!busy && coverUrl ? (
          <View className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1">
            <Text className="text-xs text-white">Uploaded ✓</Text>
          </View>
        ) : null}
      </View>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => handle("library")}
          className="flex-1 items-center rounded-lg border border-border py-2 active:opacity-80"
        >
          <Text>Choose photo</Text>
        </Pressable>
        <Pressable
          onPress={() => handle("camera")}
          className="flex-1 items-center rounded-lg border border-border py-2 active:opacity-80"
        >
          <Text>Take photo</Text>
        </Pressable>
      </View>
      {error ? <Text className="text-destructive">{error}</Text> : null}
    </View>
  );
}
