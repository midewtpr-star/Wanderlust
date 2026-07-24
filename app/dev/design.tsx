import { useEffect, useState } from "react";
import { View, ScrollView, Pressable, Modal, Text as RNText, useWindowDimensions } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenGround } from "@/components/ui/screen-ground";
import { HardShadow } from "@/components/ui/hard-shadow";
import { Boundary, TripContent } from "@/components/ui/boundary";
import { WorldMap } from "@/components/passport/world-map";
import { PersonRow } from "@/components/profile/person-row";
import { provenanceLine } from "@/lib/social";
import { Pop, FadeUp, ScanLine } from "@/components/ui/motion";
import { VerifiedAnimation } from "@/components/trip/verified-animation";
import { useTheme } from "@/lib/theme-provider";
import { isSkin, type Skin } from "@/constants/skins";
import { resolveTheme, solid, displaySize, type Scheme, type ThemeTokens } from "@/constants/design-tokens";

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

  // When a query param forces a combo, push it into the live provider too, so
  // nested components that read useTheme() (e.g. the WorldMap) follow the forced
  // skin × mode — not just the local preview cards. No param → live theme wins.
  useEffect(() => {
    if (isSkin(params.skin) && params.skin !== ctxSkin) setSkin(params.skin);
    if ((params.mode === "dark" || params.mode === "light") && params.mode !== ctxScheme) {
      setMode(params.mode);
    }
  }, [params.skin, params.mode, ctxSkin, ctxScheme, setSkin, setMode]);

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

        {/* signature moments — interactive */}
        <View style={{ height: 1, backgroundColor: t.cardBorder?.color ?? t.border, marginVertical: 4 }} />
        <MotionShowcase t={t} caps={caps} />
        <ScanDemo t={t} caps={caps} />

        {/* private / public boundary */}
        <View style={{ height: 1, backgroundColor: t.cardBorder?.color ?? t.border, marginVertical: 4 }} />
        <BoundaryDemo t={t} caps={caps} />

        {/* passport world map */}
        <View style={{ height: 1, backgroundColor: t.cardBorder?.color ?? t.border, marginVertical: 4 }} />
        <RNText style={{ fontFamily: t.displayFont, color: t.text, fontSize: 16, textTransform: caps ? "uppercase" : "none" }}>
          Passport map
        </RNText>
        <View testID="world-map">
          <WorldMap
            pins={[
              { lat: 34.05, lng: -118.24, label: "Los Angeles", kind: "place" },
              { lat: 34.13, lng: -118.32, label: "Hollywood Sign", kind: "landmark" },
              { lat: 40.71, lng: -74, label: "New York", kind: "place" },
              { lat: 51.5, lng: -0.12, label: "London", kind: "place" },
              { lat: 35.68, lng: 139.65, label: "Tokyo", kind: "place" },
              { lat: -33.87, lng: 151.2, label: "Sydney", kind: "place" },
            ]}
            height={170}
          />
        </View>

        {/* B3 · people rows (connections / search / requests share this row) */}
        <View style={{ height: 1, backgroundColor: t.cardBorder?.color ?? t.border, marginVertical: 4 }} />
        <RNText style={{ fontFamily: t.displayFont, color: t.text, fontSize: 16, textTransform: caps ? "uppercase" : "none" }}>
          People
        </RNText>
        <View testID="people-demo" style={{ gap: 4 }}>
          <PersonRow name="Maya Okafor" handle="mayao" subtitle="Los Angeles" onPress={() => {}} />
          <PersonRow
            name="Devin Park"
            handle="dpark"
            subtitle={provenanceLine(2, 4) ?? undefined}
            onPress={() => {}}
          />
          <PersonRow name="Sam Rivera" handle={null} subtitle="Request sent" />
        </View>

        {/* machine-readable token dump (for headless verification) */}
        <RNText testID="token-dump" style={{ fontFamily: t.fontBody, color: t.dim, fontSize: 11, lineHeight: 16 }}>
          {`SKIN=${skin} MODE=${mode} bg=${t.bg} card=${t.cardBg} text=${solid(t, t.text)} accent=${t.accent} accentBg=${t.accentBg} radius=${t.radius} btnRadius=${t.btnRadius} shadow=${t.shadow ? `${t.shadow.dx}x${t.shadow.dy}` : "none"} ground=${t.ground.kind} display=${t.displayFont} body=${t.fontBody ?? "system"}`}
        </RNText>
      </ScrollView>
    </ScreenGround>
  );
}

// Signature moment: tap steps → the check pops in, the row strikes through, the
// next step reveals; completing all three fires the verified celebration ONCE.
function MotionShowcase({ t, caps }: { t: ThemeTokens; caps: boolean }) {
  const [done, setDone] = useState([false, false, false]);
  const [celebrate, setCelebrate] = useState(false);
  const labels = ["Confirm your travel", "Pay your stay share", "Pay your car share"];
  const next = done.findIndex((d) => !d);
  const shape = Math.min(t.btnRadius, 13);

  function toggle(i: number) {
    setDone((prev) => {
      const nx = prev.map((d, idx) => (idx === i ? !d : d));
      if (nx.every(Boolean)) setCelebrate(true);
      return nx;
    });
  }

  return (
    <View style={{ gap: 10 }}>
      <RNText style={{ fontFamily: t.displayFont, color: t.text, fontSize: 16, textTransform: caps ? "uppercase" : "none" }}>
        Checklist → verified (tap the steps)
      </RNText>
      {labels.map((label, i) => (
        <Pressable
          key={i}
          onPress={() => toggle(i)}
          accessibilityRole="button"
          accessibilityLabel={label}
          testID={`step-${i}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}
        >
          {done[i] ? (
            <Pop>
              <View style={{ width: 26, height: 26, borderRadius: shape, backgroundColor: t.accent, alignItems: "center", justifyContent: "center" }}>
                <RNText style={{ color: t.accentInk, fontWeight: "800", fontSize: 15 }}>✓</RNText>
              </View>
            </Pop>
          ) : (
            <View style={{ width: 26, height: 26, borderRadius: shape, borderWidth: 2, borderColor: t.dim }} />
          )}
          <RNText style={{ flex: 1, color: t.text, fontFamily: t.fontBody, textDecorationLine: done[i] ? "line-through" : "none", opacity: done[i] ? 0.55 : 1 }}>
            {label}
          </RNText>
        </Pressable>
      ))}
      {next >= 0 ? (
        <FadeUp key={next} style={{ backgroundColor: t.tileBg, borderRadius: t.radius, padding: 10 }}>
          <RNText style={{ color: t.text, fontFamily: t.fontBody, fontWeight: "700" }}>Next: {labels[next]}</RNText>
        </FadeUp>
      ) : (
        <FadeUp>
          <RNText testID="all-set" style={{ color: t.text, fontFamily: t.displayFont, fontSize: 16, textTransform: caps ? "uppercase" : "none" }}>
            🎉 You&apos;re all set
          </RNText>
        </FadeUp>
      )}
      <Modal visible={celebrate} transparent animationType="fade" onRequestClose={() => setCelebrate(false)}>
        <Pressable onPress={() => setCelebrate(false)} style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 24 }}>
          <View testID="celebration" style={{ width: 300, maxWidth: "100%", alignItems: "center", backgroundColor: t.cardBg, borderRadius: t.radius, padding: 20 }}>
            <VerifiedAnimation label="You're verified! 🎉" />
            <RNText style={{ color: t.dim, fontFamily: t.fontBody, fontSize: 12 }}>Tap anywhere to dismiss</RNText>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// Signature moment: an itinerary scan line sweeps, then resolves to a success
// badge (here on a timer; the real screen swaps in the async verify result).
function ScanDemo({ t, caps }: { t: ThemeTokens; caps: boolean }) {
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  function run() {
    if (phase === "scanning") return;
    setPhase("scanning");
    setTimeout(() => setPhase("done"), 1900);
  }
  const label = phase === "scanning" ? "Scanning…" : phase === "done" ? "Scan again" : "Scan itinerary";
  return (
    <View style={{ gap: 8, marginTop: 6 }}>
      <RNText style={{ fontFamily: t.displayFont, color: t.text, fontSize: 16, textTransform: caps ? "uppercase" : "none" }}>Itinerary scan</RNText>
      <View
        style={{
          height: 150,
          borderRadius: t.radius,
          overflow: "hidden",
          backgroundColor: t.tileBg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: t.cardBorder?.width ?? 1,
          borderColor: t.cardBorder?.color ?? t.border,
        }}
      >
        <RNText style={{ fontSize: 40 }}>🧾</RNText>
        {phase === "scanning" ? <ScanLine color={t.accent} /> : null}
        {phase === "done" ? (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: t.cardBg }}>
            <FadeUp>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#34C759", alignItems: "center", justifyContent: "center" }}>
                <RNText style={{ color: "#fff", fontSize: 28 }}>✓</RNText>
              </View>
            </FadeUp>
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={run}
        accessibilityRole="button"
        style={{ backgroundColor: t.accentBg, borderRadius: t.btnRadius, paddingVertical: 12, alignItems: "center", minHeight: 44, justifyContent: "center" }}
      >
        <RNText style={{ color: t.accentInk, fontWeight: "700", fontFamily: t.fontBody, textTransform: caps ? "uppercase" : "none" }}>{label}</RNText>
      </Pressable>
    </View>
  );
}

// The private/public boundary: inside a trip (rail + 🔒 word + warm ground) vs out
// in the world (🌐, no rail). The <TripContent> guard proves trip content renders
// inside but is BLOCKED on a world surface.
function BoundaryDemo({ t, caps }: { t: ThemeTokens; caps: boolean }) {
  return (
    <View style={{ gap: 10 }}>
      <RNText style={{ fontFamily: t.displayFont, color: t.text, fontSize: 16, textTransform: caps ? "uppercase" : "none" }}>
        Private / public boundary
      </RNText>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, height: 150, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: t.cardBorder?.color ?? t.border }}>
          <Boundary variant="inside" tripName="LA Summer '26">
            <View style={{ padding: 12 }}>
              <TripContent fallback={<RNText style={{ color: t.dim }}>hidden</RNText>}>
                <RNText testID="inside-content" style={{ color: t.text, fontFamily: t.fontBody, fontSize: 12 }}>
                  Chat · money · journal
                </RNText>
              </TripContent>
            </View>
          </Boundary>
        </View>
        <View style={{ flex: 1, height: 150, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: t.cardBorder?.color ?? t.border }}>
          <Boundary variant="world">
            <View style={{ padding: 12 }}>
              <TripContent
                fallback={
                  <RNText testID="world-blocked" style={{ color: t.dim, fontFamily: t.fontBody, fontSize: 12 }}>
                    Trip content never renders here
                  </RNText>
                }
              >
                <RNText style={{ color: t.text }}>should-not-appear-on-world</RNText>
              </TripContent>
            </View>
          </Boundary>
        </View>
      </View>
    </View>
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
