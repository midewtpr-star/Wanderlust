import { useState } from "react";
import { Modal, View, Pressable, Share, ActivityIndicator } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Invite share sheet: shows the link, a native Share button, and a copy fallback.
export function InviteModal({
  visible,
  onClose,
  loading,
  error,
  webUrl,
  nativeUrl,
  shareUrl,
}: {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  webUrl: string | null;
  nativeUrl: string | null;
  shareUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const primaryLink = webUrl ?? nativeUrl ?? "";

  async function share() {
    if (!shareUrl) return;
    try {
      await Share.share({
        message: `Join my trip on Calor: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // user cancelled or the platform can't share — the copy button is the fallback
    }
  }

  async function copy() {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-background p-6" onPress={() => {}}>
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-muted" />
          </View>
          <Text variant="title">Invite people</Text>
          <Text variant="muted" className="mt-1">
            Share this link. Anyone who opens it can preview the trip and join.
          </Text>

          {loading ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : error ? (
            <Text className="mt-4 text-destructive">{error}</Text>
          ) : (
            <View className="mt-4 gap-3">
              <Card>
                <Text variant="muted" className="text-xs">
                  Link
                </Text>
                <Text numberOfLines={2} selectable>
                  {primaryLink}
                </Text>
              </Card>
              <View className="flex-row gap-2">
                <Button label="Share" className="flex-1" onPress={share} />
                <Button
                  label={copied ? "Copied ✓" : "Copy link"}
                  variant="outline"
                  className="flex-1"
                  onPress={copy}
                />
              </View>
              {nativeUrl ? (
                <Text variant="muted" className="text-xs" selectable>
                  In-app link: {nativeUrl}
                </Text>
              ) : null}
            </View>
          )}

          <Button
            label="Done"
            variant="outline"
            className="mt-4"
            onPress={onClose}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
