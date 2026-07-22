import { useState } from "react";
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";
import { useLinkPreview } from "@/hooks/use-link-preview";
import type { LinkPreview } from "@/types";
import type { PickedFile } from "@/lib/storage";

type Mode = "link" | "upload";

// Add an item to a moodboard: paste a Pinterest pin/board or any link (auto
// preview via the edge function), or upload an image. Graceful fallback when a
// preview can't be fetched — shows the raw link + lets you add it anyway.
export function AddItemModal({
  visible,
  onClose,
  onAddLink,
  onAddUpload,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  onAddLink: (preview: LinkPreview) => Promise<boolean>;
  onAddUpload: (
    file: PickedFile,
    title: string | null,
  ) => Promise<{ ok: boolean; reason?: string }>;
  busy: boolean;
}) {
  const { fetchPreview, loading: previewing } = useLinkPreview();
  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setMode("link");
    setUrl("");
    setPreview(null);
    setLocalUri(null);
    setFile(null);
    setItemTitle("");
    setErr(null);
  }
  function close() {
    reset();
    onClose();
  }

  async function getPreview() {
    setErr(null);
    if (!/^https?:\/\//i.test(url.trim())) {
      setErr("Paste a full link starting with http(s)://");
      return;
    }
    const p = await fetchPreview(url.trim());
    setPreview(p);
  }

  async function pick(source: "library" | "camera") {
    setErr(null);
    try {
      const perm =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErr("Permission was denied.");
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.7,
        base64: true,
      };
      const res =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled) return;
      const a = res.assets[0];
      setLocalUri(a.uri);
      setFile({
        uri: a.uri,
        name: a.fileName,
        mimeType: a.mimeType,
        base64: a.base64,
        size: a.fileSize,
      });
    } catch {
      setErr("Couldn't open that image. Try another.");
    }
  }

  async function addLink() {
    if (!preview) return;
    const ok = await onAddLink(preview);
    if (ok) close();
    else setErr("Couldn't add that link. Try again.");
  }
  async function addUpload() {
    if (!file) return;
    const r = await onAddUpload(file, itemTitle.trim() || preview?.title || null);
    if (r.ok) close();
    else setErr(r.reason ?? "Couldn't add that image.");
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[88%] rounded-t-3xl bg-background p-6">
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text variant="title" className="mb-4">
              Add to moodboard
            </Text>

            {/* mode toggle */}
            <View className="mb-4 flex-row rounded-xl border border-border p-1">
              <Segment label="Paste link" active={mode === "link"} onPress={() => setMode("link")} />
              <Segment label="Upload" active={mode === "upload"} onPress={() => setMode("upload")} />
            </View>

            {mode === "link" ? (
              <View className="gap-3">
                <Input
                  value={url}
                  onChangeText={(t) => {
                    setUrl(t);
                    setPreview(null);
                  }}
                  placeholder="Pinterest pin/board or any link"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <Button
                  label={previewing ? "Fetching preview…" : "Get preview"}
                  variant="secondary"
                  onPress={getPreview}
                  disabled={previewing || !url.trim()}
                />

                {preview ? (
                  <View className="overflow-hidden rounded-xl border border-border">
                    {preview.image_url ? (
                      <Image
                        source={{ uri: preview.image_url }}
                        style={{ width: "100%", height: 200 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="items-center justify-center bg-muted p-6">
                        <Text variant="muted" className="text-center">
                          No image preview — it can still be added as a link.
                        </Text>
                      </View>
                    )}
                    <View className="gap-0.5 p-3">
                      <Text numberOfLines={2}>
                        {preview.title ?? preview.url ?? "Link"}
                      </Text>
                      <Text variant="caption" numberOfLines={1}>
                        {preview.provider === "pinterest" ? "Pinterest" : "Link"}
                        {preview.author ? ` · ${preview.author}` : ""}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {preview ? (
                  <Button
                    label={busy ? "Adding…" : "Add to outfit"}
                    onPress={addLink}
                    disabled={busy}
                  />
                ) : null}
              </View>
            ) : (
              <View className="gap-3">
                <View className="h-52 w-full overflow-hidden rounded-xl border border-dashed border-border bg-muted">
                  {localUri ? (
                    <Image
                      source={{ uri: localUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Text variant="muted">No image chosen</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row gap-2">
                  <Button
                    label="Choose photo"
                    variant="secondary"
                    className="flex-1"
                    onPress={() => pick("library")}
                  />
                  <Button
                    label="Take photo"
                    variant="secondary"
                    className="flex-1"
                    onPress={() => pick("camera")}
                  />
                </View>
                {localUri ? (
                  <>
                    <Input
                      value={itemTitle}
                      onChangeText={setItemTitle}
                      placeholder="Caption (optional)"
                    />
                    <Button
                      label={busy ? "Uploading…" : "Add to outfit"}
                      onPress={addUpload}
                      disabled={busy}
                    />
                  </>
                ) : null}
              </View>
            )}

            {err ? (
              <Text className="mt-3 text-center text-destructive">{err}</Text>
            ) : null}

            <View className="m-1 mt-4">
              <Button label="Close" variant="outline" onPress={close} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Segment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={cn(
        "flex-1 items-center rounded-lg py-2 active:opacity-80",
        active ? "border border-primary bg-accent-fill" : "",
      )}
    >
      <Text
        className={active ? "text-primary-foreground" : "text-muted-foreground"}
        style={{ fontFamily: fontFamily("semibold") }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
