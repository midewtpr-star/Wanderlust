import { useEffect, useState } from "react";
import { View, Modal, Pressable, ScrollView } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/lib/theme-provider";
import {
  DEFAULT_CLIP_MS,
  clampTrimStart,
  formatMs,
  type MusicCatalogProvider,
  type Track,
} from "@/lib/music";
import type { ShareAudio } from "@/types";

// Play a 15s preview from the trim start. Only mounted when a track actually has
// a cleared preview URL, so the audio hook never runs for metadata-only entries.
function TrackPreview({ url, startMs, accent }: { url: string; startMs: number; accent: string }) {
  const player = useAudioPlayer(url);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => player.pause(), [player]);

  async function toggle() {
    if (playing) {
      player.pause();
      setPlaying(false);
      return;
    }
    await player.seekTo(startMs / 1000);
    player.play();
    setPlaying(true);
    setTimeout(() => {
      player.pause();
      setPlaying(false);
    }, DEFAULT_CLIP_MS);
  }

  return (
    <Pressable onPress={toggle} accessibilityRole="button" style={{ alignSelf: "flex-start" }}>
      <Text style={{ color: accent, fontWeight: "700" }}>{playing ? "⏸ Pause preview" : "▶ Preview 15s"}</Text>
    </Pressable>
  );
}

// A draggable 15-second window over the track. Uses the View's responder props
// (fresh closures every render — no PanResponder stale-state) so it works on web
// and native alike.
function TrimBar({
  durationMs,
  startMs,
  onChange,
}: {
  durationMs: number;
  startMs: number;
  onChange: (ms: number) => void;
}) {
  const { tokens: t } = useTheme();
  const [w, setW] = useState(0);
  const clip = Math.min(DEFAULT_CLIP_MS, durationMs);
  const winFrac = durationMs > 0 ? clip / durationMs : 1;
  const startFrac = durationMs > 0 ? startMs / durationMs : 0;

  const setFromX = (x: number) => {
    if (w === 0 || durationMs <= 0) return;
    // center the window on the touch, clamp inside the bar
    const frac = Math.max(0, Math.min(1 - winFrac, x / w - winFrac / 2));
    onChange(clampTrimStart(frac * durationMs, durationMs));
  };

  return (
    <View className="gap-1">
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => setFromX(e.nativeEvent.locationX)}
        onResponderMove={(e) => setFromX(e.nativeEvent.locationX)}
        style={{
          height: 40,
          borderRadius: t.radius,
          backgroundColor: t.surface2,
          borderWidth: t.cardBorder?.width ?? 1,
          borderColor: t.cardBorder?.color ?? t.border,
          overflow: "hidden",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: `${startFrac * 100}%`,
            width: `${winFrac * 100}%`,
            top: 0,
            bottom: 0,
            backgroundColor: t.accentBg,
            opacity: 0.85,
            borderRadius: t.radius,
          }}
        />
        <Text style={{ textAlign: "center", color: t.text, fontSize: 11, fontWeight: "700" }}>
          {formatMs(startMs)} – {formatMs(Math.min(startMs + clip, durationMs))}
        </Text>
      </View>
      <Text variant="caption">Drag to pick your 15-second clip.</Text>
    </View>
  );
}

// The controlled music sheet. The recap owns the useShareMusic hook and passes
// the provider (null = not configured), the current choice, and the persist/clear
// callbacks. Cleared-catalogue only; no uploads.
export function MusicPicker({
  visible,
  onClose,
  provider,
  current,
  onPick,
  onRemove,
}: {
  visible: boolean;
  onClose: () => void;
  provider: MusicCatalogProvider | null;
  current: ShareAudio | null;
  onPick: (track: Track, startMs: number) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
}) {
  const { tokens: t } = useTheme();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Track | null>(null);
  const [startMs, setStartMs] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible || !provider) return;
    let live = true;
    provider.list().then((ts) => live && setTracks(ts));
    return () => {
      live = false;
    };
  }, [visible, provider]);

  async function runSearch(q: string) {
    setQuery(q);
    if (provider) setTracks(await provider.search(q));
  }

  function select(track: Track) {
    setSelected(track);
    setStartMs(0);
  }

  async function use() {
    if (!selected) return;
    setBusy(true);
    const ok = await onPick(selected, startMs);
    setBusy(false);
    if (ok) {
      setSelected(null);
      onClose();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.bg,
            borderTopLeftRadius: Math.max(t.radius, 16),
            borderTopRightRadius: Math.max(t.radius, 16),
            padding: 20,
            gap: 14,
            maxHeight: "88%",
          }}
        >
          <View className="gap-1">
            <Text variant="heading">Add music to your share</Text>
            <Text variant="muted">
              Music plays on video recaps (coming soon). Your image export always works without it.
            </Text>
          </View>

          {!provider ? (
            // Not configured — the shipped default
            <View className="gap-3 py-6 items-center px-2">
              <Text variant="heading" className="text-center">
                Music isn’t set up yet
              </Text>
              <Text variant="muted" className="text-center">
                A cleared music catalogue hasn’t been configured for Trippl. You can still share your recap — just
                without music.
              </Text>
              <Button label="Share without music" onPress={onClose} />
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
              {current ? (
                <View
                  style={{
                    padding: 12,
                    borderRadius: t.radius,
                    backgroundColor: t.tileBg,
                    borderWidth: t.tileBorder?.width ?? 0,
                    borderColor: t.tileBorder?.color,
                  }}
                >
                  <Text variant="caption">Current</Text>
                  <Text variant="heading">♪ {current.title}</Text>
                  <Text variant="muted">{current.artist ?? ""}</Text>
                  <Pressable onPress={onRemove} accessibilityRole="button" className="pt-1">
                    <Text variant="caption" style={{ textDecorationLine: "underline" }}>
                      Remove music
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <Input
                value={query}
                onChangeText={runSearch}
                placeholder="Search the catalogue"
                autoCapitalize="none"
              />
              <Text variant="caption">{provider.licenseNote}</Text>

              {tracks.map((track) => {
                const isSel = selected?.id === track.id;
                return (
                  <View key={track.id} className="gap-2">
                    <Pressable
                      onPress={() => select(track)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSel }}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: t.radius,
                        backgroundColor: isSel ? t.accentBg : t.cardBg,
                        borderWidth: t.cardBorder?.width ?? 1,
                        borderColor: isSel ? t.accent : t.cardBorder?.color ?? t.border,
                      }}
                    >
                      <View className="flex-1 pr-3">
                        <Text style={{ color: isSel ? t.accentInk : t.text, fontWeight: "700" }}>{track.title}</Text>
                        <Text style={{ color: isSel ? t.accentInk : t.dim, fontSize: 12 }}>
                          {track.artist} · {formatMs(track.durationMs)}
                        </Text>
                      </View>
                    </Pressable>

                    {isSel ? (
                      <View className="gap-2 px-1 pb-1">
                        <TrimBar durationMs={track.durationMs} startMs={startMs} onChange={setStartMs} />
                        {track.previewUrl ? (
                          <TrackPreview url={track.previewUrl} startMs={startMs} accent={t.accent} />
                        ) : (
                          <Text variant="caption">Preview unavailable in this catalogue.</Text>
                        )}
                        <Text variant="caption">Rights: {track.license}</Text>
                        <Button label={busy ? "Saving…" : "Use this track"} disabled={busy} onPress={use} />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
