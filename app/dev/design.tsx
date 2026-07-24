import { View, ScrollView, Pressable, Text as RNText, useWindowDimensions } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenGround } from "@/components/ui/screen-ground";
import { HardShadow } from "@/components/ui/hard-shadow";
import { useTheme } from "@/lib/theme-provider";
import { isSkin, type Skin } from "@/constants/skins";
import { resolveTheme, solid, displaySize, type Scheme } from "@/constants/design-tokens";

// DEV-ONLY design-token diagnostics. Renders the ported token system for a
// skin × mode so every combination can be verified on iOS, Android and web —
// including the collage graph-paper ground and the hard offset shadows. Force a
// combination with `?skin=collage&mode=dark`; otherwise it follows the live theme.
// Public (added to the route-protection allowlist) so it's reachable headlessly.
export default function DesignHarness() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { skin: ctxSkin, scheme: ctxScheme, setSkin, setMode } = useTheme();
  const params = useLocalSearchParams<{ skin?: string; mode?: string }>();

  const skin: Skin = isSkin(params.skin) ? params.skin : ctxSkin;
  const mode: Scheme =
    params.mode === "dark" ? "dark" : params.mode === "light" ? "light" : ctxScheme;
  const t = resolveTheme(skin, mode);

  const caps = skin !== "editorial";
  const swatches: [string, string][] = [
    ["bg", t.bg],
    ["surface", t.surface],
    ["surface2", t.surface2],
    ["card", t.cardBg],
    ["text", solid(t, t.text)],
    ["dim", solid(t, t.dim)],
    ["border", t.cardBorder?.color ?? t.border],
    ["accent", t.accent],
  ];

  return (
    <ScreenGround tokens={t} style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "Design tokens (dev)" }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 16 }}>
        {/* skin / mode switcher (affects the live theme when no query is forcing a combo) */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {(["editorial", "collage", "poster"] as Skin[]).map((s) => (
            <Chip key={s} label={s} active={skin === s} color={t.accent} ink={t.accentInk} text={t.text} onPress={() => setSkin(s)} />
          ))}
          {(["light", "dark"] as Scheme[]).map((m) => (
            <Chip key={m} label={m} active={mode === m} color={t.accent} ink={t.accentInk} text={t.text} onPress={() => setMode(m)} />
          ))}
        </View>

        {/* display + script type */}
        <RNText
          style={{
            fontFamily: t.displayFont,
            color: t.text,
            fontSize: displaySize("xl", width),
            textTransform: caps ? "uppercase" : "none",
            lineHeight: displaySize("xl", width),
          }}
        >
          Los Angeles
        </RNText>
        {t.scriptFont ? (
          <RNText style={{ fontFamily: t.scriptFont, color: t.accent, fontSize: 30, marginTop: -8 }}>getaway</RNText>
        ) : null}
        <RNText style={{ fontFamily: t.fontBody, color: t.dim, fontSize: 13 }}>
          Body copy · {skin} / {mode} · Aug 18–23 · 2026
        </RNText>

        {/* hard-shadow card (collage) / soft card (editorial) / flat block (poster) */}
        <HardShadow shadow={t.shadow} radius={t.radius}>
          <View
            style={{
              backgroundColor: t.cardBg,
              borderRadius: t.radius,
              borderWidth: t.cardBorder?.width ?? 0,
              borderColor: t.cardBorder?.color,
              padding: 14,
              gap: 6,
            }}
          >
            <RNText style={{ fontFamily: t.displayFont, color: t.text, fontSize: 16, textTransform: caps ? "uppercase" : "none" }}>
              Countdown
            </RNText>
            <RNText style={{ fontFamily: t.numFont, color: t.text, fontVariant: ["tabular-nums"], fontSize: 24, fontWeight: "800" }}>
              25 : 18 : 04 : 30
            </RNText>
          </View>
        </HardShadow>

        {/* primary button */}
        <View style={{ backgroundColor: t.accentBg, borderRadius: t.btnRadius, paddingVertical: 13, alignItems: "center" }}>
          <RNText style={{ color: t.accentInk, fontFamily: t.fontBody, fontWeight: "700", textTransform: caps ? "uppercase" : "none", letterSpacing: caps ? 0.6 : 0 }}>
            Primary — Pay $420 share
          </RNText>
        </View>

        {/* token swatches */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {swatches.map(([name, hex]) => (
            <View key={name} style={{ alignItems: "center", width: 64 }}>
              <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: hex, borderWidth: 1, borderColor: t.cardBorder?.color ?? t.border }} />
              <RNText style={{ fontFamily: t.fontBody, color: t.dim, fontSize: 9, marginTop: 4 }}>{name}</RNText>
              <RNText style={{ fontFamily: t.fontBody, color: t.dim, fontSize: 8 }}>{hex}</RNText>
            </View>
          ))}
        </View>

        {/* machine-readable token dump (for headless verification) */}
        <RNText testID="token-dump" style={{ fontFamily: t.fontBody, color: t.dim, fontSize: 11, lineHeight: 16 }}>
          {`SKIN=${skin} MODE=${mode} bg=${t.bg} card=${t.cardBg} text=${solid(t, t.text)} accent=${t.accent} accentBg=${t.accentBg} radius=${t.radius} btnRadius=${t.btnRadius} shadow=${t.shadow ? `${t.shadow.dx}x${t.shadow.dy}` : "none"} ground=${t.ground.kind} display=${t.displayFont} body=${t.fontBody ?? "system"}`}
        </RNText>
      </ScrollView>
    </ScreenGround>
  );
}

function Chip({
  label,
  active,
  color,
  ink,
  text,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  ink: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? color : "transparent",
        borderWidth: 1,
        borderColor: color,
        minHeight: 44,
        justifyContent: "center",
      }}
    >
      <RNText style={{ color: active ? ink : text, fontWeight: "700", fontSize: 12 }}>{label}</RNText>
    </Pressable>
  );
}
