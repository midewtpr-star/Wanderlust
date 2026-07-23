import { Platform } from "react-native";
import { hexToHslTriplet } from "@/lib/theme-color";

// Trippl — App skins (Section 13). Three selectable visual versions of the SAME
// app. A skin changes look only (tokens, type, ornament, component styling), never
// the IA / navigation / behavior. Editorial is the default and matches the main
// brief; Collage + Poster are alternative token/type/ornament layers.
//
// Mechanism: the ThemeProvider sets the current skin's NEUTRAL + radius CSS
// variables for the whole app (like dark mode), so every token-driven surface
// re-skins from one place; primitives read the skin for type + shape; hero
// surfaces add skin-specific ornament (see components/trip/skin-trip-header etc.).

export type Skin = "editorial" | "collage" | "poster";
export const DEFAULT_SKIN: Skin = "editorial";
export const ALL_SKINS: Skin[] = ["editorial", "collage", "poster"];

export const SKINS: { id: Skin; name: string; tagline: string }[] = [
  { id: "editorial", name: "Editorial", tagline: "Quiet, confident, expensive." },
  { id: "collage", name: "Collage", tagline: "A corkboard of memories — tactile + playful." },
  { id: "poster", name: "Poster", tagline: "A concert poster for your trip — loud + graphic." },
];

export function isSkin(v: unknown): v is Skin {
  return v === "editorial" || v === "collage" || v === "poster";
}

// --- Neutral tokens per skin × scheme. Text stays high-contrast vs bg (WCAG AA)
// in every case; the loud color lives in ORNAMENT (gradient zones / color fields),
// not the neutrals. ---
export type SkinNeutral = {
  bg: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
};

export const SKIN_NEUTRALS: Record<Skin, { light: SkinNeutral; dark: SkinNeutral }> = {
  editorial: {
    light: { bg: "#FFFFFF", surface: "#F5F5F7", text: "#000000", textSecondary: "#6E6E73", border: "#E5E5EA" },
    dark: { bg: "#1C1C1E", surface: "#2C2C2E", text: "#FFFFFF", textSecondary: "#AEAEB2", border: "#38383A" },
  },
  collage: {
    // warm paper + graph grid drawn on top (ornament)
    light: { bg: "#FBF7EF", surface: "#F2EADB", text: "#1A1815", textSecondary: "#6E6455", border: "#E2D6BF" },
    dark: { bg: "#111013", surface: "#1B1A1F", text: "#F5F1E8", textSecondary: "#A9A295", border: "#33303A" },
  },
  poster: {
    // cream + cobalt ink; color FIELDS applied as ornament
    light: { bg: "#F7EFDD", surface: "#EEE3C9", text: "#14213D", textSecondary: "#49527A", border: "#DBCBA8" },
    dark: { bg: "#0B1533", surface: "#132049", text: "#F3EEDF", textSecondary: "#AAB4D6", border: "#26305C" },
  },
};

export function skinNeutral(skin: Skin, scheme: "light" | "dark"): SkinNeutral {
  return SKIN_NEUTRALS[skin][scheme];
}

// Base corner-radius personality per skin.
export const SKIN_RADIUS: Record<Skin, number> = { editorial: 12, collage: 10, poster: 3 };

// Tailwind radius class for primitives per skin (poster = hard edges).
export function skinRadius(skin: Skin, size: "sm" | "lg" = "lg"): string {
  if (skin === "poster") return size === "lg" ? "rounded" : "rounded-sm";
  if (skin === "collage") return size === "lg" ? "rounded-xl" : "rounded-lg";
  return size === "lg" ? "rounded-2xl" : "rounded-xl"; // editorial
}

// Signature color pair per skin (gradient zones for collage, color fields for
// poster). Destination themes override these where they apply.
export const SKIN_SIGNATURE: Record<Skin, { a: string; b: string }> = {
  editorial: { a: "#000000", b: "#FFFFFF" },
  collage: { a: "#FF2D95", b: "#12B5C9" }, // hot pink → teal
  poster: { a: "#1D4ED8", b: "#F7EFDD" }, // cobalt on cream
};

// The neutral + radius CSS-variable map for a skin × scheme, ready for vars().
export function skinVars(skin: Skin, scheme: "light" | "dark"): Record<string, string> {
  const n = SKIN_NEUTRALS[skin][scheme];
  const t = (hex: string) => hexToHslTriplet(hex);
  return {
    "--background": t(n.bg),
    "--foreground": t(n.text),
    "--card": t(n.surface),
    "--card-foreground": t(n.text),
    "--popover": t(n.surface),
    "--popover-foreground": t(n.text),
    "--secondary": t(n.surface),
    "--secondary-foreground": t(n.text),
    "--muted": t(n.surface),
    "--muted-foreground": t(n.textSecondary),
    "--border": t(n.border),
    "--input": t(n.border),
    "--radius": `${SKIN_RADIUS[skin]}px`,
  };
}

// --- Typography per skin. Type is a defining part of each skin's voice. We use
// widely-available system families (+ case/tracking/weight) so no font bundling
// is required for this layer; bundling a condensed grotesque (Poster) + a script
// (the caps/script collision) is a documented polish step. ---
export type TypeRole = "display" | "heading" | "body" | "label";

const SERIF = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia, 'Times New Roman', serif",
});
const MONO = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "ui-monospace, Menlo, 'Courier New', monospace",
});
const CONDENSED = Platform.select({
  ios: undefined, // no system condensed grotesque — falls back to system + caps
  android: "sans-serif-condensed",
  default: "'Arial Narrow', 'Roboto Condensed', 'Oswald', sans-serif",
});

export type SkinType = {
  fontFamily?: string;
  textTransform?: "uppercase" | "none";
  letterSpacing?: number;
};

// The skin's type treatment for a role. Returns undefined fontFamily to mean
// "use the system/Inter default" (constants/theme fontFamily()).
export function skinType(skin: Skin, role: TypeRole): SkinType {
  if (skin === "editorial") {
    if (role === "display" || role === "heading") return { fontFamily: SERIF, letterSpacing: -0.4 };
    return {}; // body/label: clean neutral sans
  }
  if (skin === "collage") {
    if (role === "display") return { letterSpacing: -0.6 }; // bold geometric sans (via weight)
    if (role === "heading") return {}; // bold sans
    if (role === "label") return { fontFamily: MONO, textTransform: "uppercase", letterSpacing: 1 };
    return { fontFamily: MONO, letterSpacing: 0.3 }; // body: mono, normal case (long text stays legible)
  }
  // poster
  if (role === "display") return { fontFamily: CONDENSED, textTransform: "uppercase", letterSpacing: 0.5 };
  if (role === "heading") return { textTransform: "uppercase", letterSpacing: 0.6 };
  if (role === "label") return { textTransform: "uppercase", letterSpacing: 1.2 };
  return {}; // body: readable sans (density rule — caps reserved for headers/labels)
}

// Skins where emoji/graphic marks are welcome as punctuation (Collage only).
export const skinAllowsEmoji = (skin: Skin) => skin === "collage";
