import { View, type DimensionValue } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme-provider";

// The cover photo (or a token-coloured fallback), filling its parent.
function CoverImage({
  coverUrl,
  fallbackBg,
  opacity = 1,
}: {
  coverUrl: string | null | undefined;
  fallbackBg: string;
  opacity?: number;
}) {
  const size = { width: "100%" as DimensionValue, height: "100%" as DimensionValue };
  return coverUrl ? (
    <Image source={{ uri: coverUrl }} style={[size, { opacity }]} contentFit="cover" transition={200} />
  ) : (
    <View style={[size, { backgroundColor: fallbackBg, opacity }]} />
  );
}

// The trip cover HERO — a "loud" surface (density rule). It renders the same
// information (title + a meta line over the cover) three ways:
//   · Editorial → full-bleed photo under a dark scrim; a Playfair title mixing
//     roman + italic (last word italic).
//   · Collage   → the photo in a hard-bordered white frame with a strip of tape
//     and a hot-pink title sticker, floating on the graph-paper ground.
//   · Poster    → duotone photo under a cobalt wash; an Anton caps title.
// Falls back to a token-coloured block when there is no cover image.
export function HeroCover({
  coverUrl,
  title,
  subtitle,
  height = 210,
}: {
  coverUrl: string | null | undefined;
  title: string;
  subtitle?: string | null;
  height?: number;
}) {
  const { tokens: t } = useTheme();
  const words = title.trim().split(/\s+/);
  const lastWord = words.length > 1 ? words[words.length - 1] : "";
  const head = words.length > 1 ? words.slice(0, -1).join(" ") + " " : title;

  // ---- Collage: framed, taped photo + pink title sticker on the ground ----
  if (t.skin === "collage") {
    const hard = t.cardBorder?.color ?? "#141414";
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 }}>
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: t.cardBorder?.width ?? 1.5,
            borderColor: hard,
            padding: 6,
            transform: [{ rotate: "-1.5deg" }],
          }}
        >
          <View style={{ height, overflow: "hidden" }}>
            <CoverImage coverUrl={coverUrl} fallbackBg={t.tileBg} />
          </View>
          {/* strip of tape */}
          <View
            style={{
              position: "absolute",
              top: -9,
              left: "42%",
              width: 60,
              height: 18,
              backgroundColor: "rgba(255,214,10,0.65)",
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "rgba(0,0,0,0.3)",
              transform: [{ rotate: "3deg" }],
            }}
          />
        </View>
        {/* pink title sticker */}
        <View
          style={{
            alignSelf: "flex-start",
            marginTop: -14,
            marginLeft: 10,
            backgroundColor: t.accent,
            borderWidth: t.cardBorder?.width ?? 1.5,
            borderColor: hard,
            paddingHorizontal: 10,
            paddingVertical: 5,
            transform: [{ rotate: "-2deg" }],
          }}
        >
          <Text variant="heading" style={{ color: t.accentInk }} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text variant="caption" className="ml-3 mt-2">
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  // ---- Poster: duotone photo under a cobalt wash + Anton caps title ----
  if (t.skin === "poster") {
    return (
      <View style={{ height, position: "relative", overflow: "hidden" }}>
        <CoverImage coverUrl={coverUrl} fallbackBg={t.tileBg} opacity={0.55} />
        <LinearGradient
          colors={["rgba(37,71,198,0.25)", t.dark ? "rgba(16,25,80,0.85)" : "rgba(37,71,198,0.8)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View style={{ position: "absolute", left: 16, bottom: 14, right: 16 }}>
          <Text variant="display-lg" style={{ color: t.text }} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" style={{ color: t.text, opacity: 0.85, marginTop: 4 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  // ---- Editorial: full-bleed photo, dark scrim, Playfair roman + italic ----
  return (
    <View style={{ height, position: "relative", overflow: "hidden" }}>
      <CoverImage coverUrl={coverUrl} fallbackBg={t.tileBg} />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.62)"]}
        locations={[0.45, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ position: "absolute", left: 16, bottom: 14, right: 16 }}>
        <Text variant="display-lg" style={{ color: "#FFFFFF", fontFamily: t.displayFont }} numberOfLines={2}>
          {head}
          {lastWord ? (
            <Text style={{ fontFamily: t.displayItalic ?? t.displayFont, fontStyle: "italic", color: "#FFFFFF" }}>
              {lastWord}
            </Text>
          ) : null}
        </Text>
        {subtitle ? (
          <Text
            variant="caption"
            style={{ color: "#FFFFFF", opacity: 0.9, marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
