import { resolveTheme, tokenNeutralVars, solid, FONT } from "@/constants/design-tokens";

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

// Native-consumable neutrals shape. Concrete values now come from the ported
// design tokens (see `skinNeutral` below / `constants/design-tokens.ts`), not a
// hardcoded table — the design system is canonical (decisions.md DS-1…DS-5).
export type SkinNeutral = {
  bg: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
};

// Native-consumable neutrals for a skin × scheme, derived from the ported design
// tokens (screen base, card surface, text, dim, border). Used by native chrome
// (headers, tab bar), progress rings, and input placeholders.
export function skinNeutral(skin: Skin, scheme: "light" | "dark"): SkinNeutral {
  const t = resolveTheme(skin, scheme);
  return {
    bg: t.screenBase,
    surface: t.cardBg,
    text: solid(t, t.text),
    textSecondary: solid(t, t.dim),
    border: t.cardBorder?.color ?? t.border,
  };
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
// Neutral CSS-variable map for a skin × scheme (drives Tailwind neutral classes on
// SkinScope subtrees, e.g. the skin picker previews). Delegates to the ported
// design tokens so previews match the live app exactly.
export function skinVars(skin: Skin, scheme: "light" | "dark"): Record<string, string> {
  return tokenNeutralVars(resolveTheme(skin, scheme));
}

// --- Typography per skin. Type is a defining part of each skin's voice. We use
// widely-available system families (+ case/tracking/weight) so no font bundling
// is required for this layer; bundling a condensed grotesque (Poster) + a script
// (the caps/script collision) is a documented polish step. ---
export type TypeRole = "display" | "heading" | "body" | "label";

export type SkinType = {
  fontFamily?: string;
  textTransform?: "uppercase" | "none";
  letterSpacing?: number;
};

// The skin's type treatment for a role. Returns undefined fontFamily to mean
// "use the system/Inter default" (constants/theme fontFamily()).
export function skinType(skin: Skin, role: TypeRole): SkinType {
  if (skin === "editorial") {
    // Playfair Display for display + headings (roman); body/label = clean system sans.
    if (role === "display" || role === "heading") return { fontFamily: FONT.playfair, letterSpacing: -0.4 };
    return {};
  }
  if (skin === "collage") {
    if (role === "display") return { fontFamily: FONT.archivoBlack, letterSpacing: -0.6 };
    if (role === "heading") return { fontFamily: FONT.archivoBold };
    if (role === "label") return { fontFamily: FONT.spaceMono, textTransform: "uppercase", letterSpacing: 1 };
    return { fontFamily: FONT.spaceMono, letterSpacing: 0.3 }; // body: mono, normal case (long text stays legible)
  }
  // poster
  if (role === "display") return { fontFamily: FONT.anton, textTransform: "uppercase", letterSpacing: 0.5 };
  if (role === "heading") return { fontFamily: FONT.archivoBold, textTransform: "uppercase", letterSpacing: 0.6 };
  if (role === "label") return { fontFamily: FONT.archivo, textTransform: "uppercase", letterSpacing: 1.2 };
  return { fontFamily: FONT.archivo }; // body: Archivo (density rule — caps reserved for headers/labels)
}

// Skins where emoji/graphic marks are welcome as punctuation (Collage only).
export const skinAllowsEmoji = (skin: Skin) => skin === "collage";
