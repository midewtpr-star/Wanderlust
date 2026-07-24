import { type ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";
import { ScreenGround } from "@/components/ui/screen-ground";
import { SurfaceProvider } from "@/components/ui/surface-context";
import { useTheme } from "@/lib/theme-provider";
import type { Surface } from "@/lib/surface";
import type { Skin } from "@/constants/skins";

// Re-export the context + guard so screens import them from one place.
export { useSurface, TripContent } from "@/components/ui/surface-context";

// The private/public boundary (B1) as a LAYOUT PRIMITIVE. The boundary is signalled
// three ways at once (so it never depends on reading a label): warmth, enclosure,
// and a persistent word.
//   · inside a trip → warm ground, a coloured left rail, "🔒 Inside · <trip>".
//   · out in the world → cool ground, no rail, edge-to-edge, "🌐 World".
// It also provides the SurfaceContext that the <TripContent> guard reads to enforce
// the hard rule: trip content never renders on a world surface (lib/surface.ts).

// Per-skin warmth for an inside surface (design system § boundary). Editorial warms
// to paper; collage adds a kraft warmth over the grid; poster darkens the field a step.
function insideOverlay(skin: Skin, dark: boolean): string {
  if (skin === "poster") return "rgba(0,0,0,0.16)";
  if (skin === "collage") return dark ? "rgba(255,220,150,0.05)" : "rgba(200,150,80,0.06)";
  return dark ? "rgba(150,110,50,0.14)" : "rgba(214,163,90,0.10)";
}

function BoundaryWord({ inside, tripName }: { inside: boolean; tripName?: string }) {
  const { tokens: t } = useTheme();
  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, zIndex: 3 }}>
      <View
        style={{
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderRadius: 999,
          paddingHorizontal: 11,
          paddingVertical: 5,
          maxWidth: "100%",
          backgroundColor: inside ? t.accent : t.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
          borderWidth: inside ? 0 : StyleSheet.hairlineWidth,
          borderColor: t.border,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ fontSize: 11, fontWeight: "700", color: inside ? t.accentInk : t.accent }}
        >
          {inside ? `🔒 Inside · ${tripName ?? "this trip"}` : "🌐 World"}
        </Text>
      </View>
    </View>
  );
}

export function Boundary({
  variant,
  tripName,
  children,
}: {
  variant: Surface;
  tripName?: string;
  children: ReactNode;
}) {
  const { tokens: t } = useTheme();
  const inside = variant === "inside";
  return (
    <SurfaceProvider value={{ surface: variant, tripName }}>
      <ScreenGround style={{ flex: 1 }}>
        {inside ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: insideOverlay(t.skin, t.dark) }]}
          />
        ) : null}
        <BoundaryWord inside={inside} tripName={tripName} />
        <View style={{ flex: 1 }}>{children}</View>
        {inside ? (
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, backgroundColor: t.accent, zIndex: 4 }}
          />
        ) : null}
      </ScreenGround>
    </SurfaceProvider>
  );
}

