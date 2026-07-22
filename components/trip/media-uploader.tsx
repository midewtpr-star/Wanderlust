import { useState } from "react";
import { View, Platform, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { PickedFile } from "@/lib/storage";
import type { MediaType } from "@/types";
import type { UploadItem } from "@/hooks/use-activity-media";

type Staged = { file: PickedFile; caption: string; kind: MediaType; preview: string };

function toStaged(a: ImagePicker.ImagePickerAsset): Staged {
  const isVideo =
    a.type === "video" || (a.mimeType?.startsWith("video") ?? false);
  return {
    file: {
      uri: a.uri,
      name: a.fileName,
      mimeType: a.mimeType,
      size: a.fileSize ?? null,
    },
    caption: "",
    kind: isVideo ? "video" : "photo",
    preview: a.uri,
  };
}

// Stages picked photos/videos with per-item captions, then uploads them.
// Multi-select from the library; camera on native. Size guardrail + progress
// live in useActivityMedia — this surfaces them.
export function MediaUploader({
  onUpload,
  progress,
}: {
  onUpload: (items: UploadItem[]) => Promise<{ ok: number; skipped: string[] }>;
  progress: { done: number; total: number } | null;
}) {
  const [staged, setStaged] = useState<Staged[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function pickLibrary() {
    setNote(null);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (res.canceled) return;
    setStaged((s) => [...s, ...res.assets.map(toStaged)]);
  }

  async function capture() {
    setNote(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setNote("Camera permission is needed to capture media.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (res.canceled) return;
    setStaged((s) => [...s, ...res.assets.map(toStaged)]);
  }

  function setCaption(i: number, text: string) {
    setStaged((s) => s.map((x, idx) => (idx === i ? { ...x, caption: text } : x)));
  }
  function removeStaged(i: number) {
    setStaged((s) => s.filter((_, idx) => idx !== i));
  }

  async function doUpload() {
    if (staged.length === 0) return;
    setBusy(true);
    setNote(null);
    const { ok, skipped } = await onUpload(
      staged.map((s) => ({ file: s.file, caption: s.caption, kind: s.kind })),
    );
    setBusy(false);
    setStaged([]);
    if (skipped.length) {
      setNote(`Uploaded ${ok}. Skipped ${skipped.length}: ${skipped.join(", ")}.`);
    } else if (ok > 0) {
      setNote(`Uploaded ${ok} item${ok === 1 ? "" : "s"}.`);
    }
  }

  return (
    <Card className="gap-3">
      <Text variant="heading">Add photos & videos</Text>
      <View className="flex-row gap-2">
        <Button
          label="Choose from library"
          className="flex-1"
          onPress={pickLibrary}
          disabled={busy}
        />
        {Platform.OS !== "web" ? (
          <Button label="Camera" variant="secondary" onPress={capture} disabled={busy} />
        ) : null}
      </View>

      {staged.map((s, i) => (
        <View key={i} className="flex-row items-center gap-2">
          {s.kind === "photo" ? (
            <Image
              source={{ uri: s.preview }}
              style={{ width: 48, height: 48, borderRadius: 6 }}
              contentFit="cover"
            />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-md bg-muted">
              <Text className="text-lg">🎬</Text>
            </View>
          )}
          <Input
            value={s.caption}
            onChangeText={(t) => setCaption(i, t)}
            placeholder="Caption (optional)"
            className="flex-1"
          />
          <Button
            label="✕"
            variant="outline"
            size="sm"
            onPress={() => removeStaged(i)}
            disabled={busy}
          />
        </View>
      ))}

      {progress ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator />
          <Text variant="muted">
            Uploading {progress.done}/{progress.total}…
          </Text>
        </View>
      ) : staged.length > 0 ? (
        <Button
          label={busy ? "Uploading…" : `Upload ${staged.length}`}
          onPress={doUpload}
          disabled={busy}
        />
      ) : null}

      {note ? (
        <Text variant="muted" className="text-xs">
          {note}
        </Text>
      ) : null}
    </Card>
  );
}
