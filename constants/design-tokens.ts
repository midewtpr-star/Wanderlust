import { contrastOn, fontFamily } from "@/constants/theme";
import { hexToHslTriplet } from "@/lib/theme-color";
import type { Skin } from "@/constants/skins";

// Trippl — DESIGN TOKENS. The single source of truth for skin × mode styling,
// ported verbatim from the canonical Claude Design system's theme() method
// (docs/design.md → "Ported token system"). resolveTheme(skin, mode, accent)
// returns the full token set the design system produces per combination.
//
// The export is HTML/CSS; several treatments are re-expressed for React Native:
//   · collage graph-paper ground  → a structured `ground` descriptor rendered by
//     <ScreenGround> as a tiled react-native-svg grid + expo-linear-gradient wash.
//   · collage hard offset shadow  → a structured `shadow` rendered by <HardShadow>
//     as a duplicate offset layer (RN shadows blur; this keeps a hard edge).
//   · poster colour field         → a solid `field` ground.
// clamp() display sizes become a breakpoint-keyed responsive scale (displaySize).

export type Scheme = "light" | "dark";
export type { Skin } from "@/constants/skins";

// --- Neutral tokens (design system 01 Foundations). Dark base is grey, not black. ---
export const NEUTRALS_LIGHT = {
  bg: "#FFFFFF",
  surface: "#F5F5F7",
  surface2: "#ECECEF",
  text: "#000000",
  dim: "#6E6E73",
  border: "#E5E5EA",
} as const;
export const NEUTRALS_DARK = {
  bg: "#1C1C1E",
  surface: "#2C2C2E",
  surface2: "#3A3A3C",
  text: "#FFFFFF",
  dim: "#AEAEB2",
  border: "#38383A",
} as const;

// --- Semantic colours (informational, never decorative — pair with icon/text). ---
export const SEMANTIC = {
  success: "#34C759", // paid, verified
  warning: "#FF9500", // due soon
  error: "#FF3B30", // failed proof
  info: "#007AFF", // neutral notice
} as const;

// --- 4pt spacing scale + 44pt minimum touch target. ---
export const SPACING = { s1: 4, s2: 8, s3: 12, s4: 16, s6: 24, s8: 32 } as const;
export const RADII = { input: 6, card: 14, pill: 999 } as const; // editorial generic scale
export const TOUCH_MIN = 44;

// --- Default accent = cobalt, mode-aware (supersedes the old black default; the
// full picker stays — see docs/decisions.md D11 override). Editorial uses the
// user's accent; collage/poster override it with their signature accent. ---
export const COBALT_LIGHT = "#2547C6";
export const COBALT_DARK = "#6E8CFF";
export const DEFAULT_ACCENT_COBALT = COBALT_LIGHT;

// --- Per-skin font families (bundled via expo-font in app/_layout). Body/UI text
// stays system-ui + Inter for editorial; collage/poster carry Space Mono / Archivo
// per the theme() script. SF Pro is never bundled. ---
export const FONT = {
  playfair: "PlayfairDisplay_600SemiBold",
  playfairItalic: "PlayfairDisplay_600SemiBold_Italic",
  playfairBold: "PlayfairDisplay_700Bold",
  anton: "Anton_400Regular",
  archivo: "Archivo_400Regular",
  archivoBold: "Archivo_700Bold",
  archivoBlack: "Archivo_900Black",
  spaceMono: "SpaceMono_400Regular",
  spaceMonoBold: "SpaceMono_700Bold",
  greatVibes: "GreatVibes_400Regular",
} as const;

// Body font per skin. Editorial → system/Inter (undefined iOS/web, Inter Android).
function bodyFont(skin: Skin): string | undefined {
  if (skin === "collage") return FONT.spaceMono;
  if (skin === "poster") return FONT.archivo;
  return fontFamily(); // editorial: system-ui / Inter
}

export type Wash = { colors: [string, string, string]; locations: [number, number, number] };
export type Ground =
  | { kind: "solid"; color: string }
  | { kind: "field"; color: string } // poster cobalt field
  | { kind: "grid"; base: string; line: string; cell: number; wash: Wash };

export type BorderSpec = { width: number; color: string } | null;
export type ShadowSpec = { dx: number; dy: number; color: string } | null;

export type ThemeTokens = {
  skin: Skin;
  scheme: Scheme;
  dark: boolean;
  // neutrals
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  dim: string; // may be rgba (poster) — fine for RN color props
  border: string;
  // accent
  accent: string; // visible ink (text/stroke/border) — always visible
  accentInk: string; // label sitting ON the accent fill (contrast-checked)
  accentBg: string; // primary-button fill (poster = cream, else = accent)
  // surfaces
  ground: Ground;
  screenBase: string; // flat base colour (for bg-background before <ScreenGround> wraps)
  cardBg: string;
  cardBorder: BorderSpec;
  tileBg: string;
  tileBorder: BorderSpec;
  radius: number;
  btnRadius: number;
  shadow: ShadowSpec; // collage hard offset shadow, else null
  // fonts
  fontBody?: string;
  displayFont: string;
  displayItalic?: string;
  scriptFont?: string;
  numFont?: string; // tabular figures family (money + countdown); undefined = system
};

// Port of the design system's theme(). accentHex is the EDITORIAL accent (the
// user's picker choice); pass undefined for the cobalt default. Collage + poster
// ignore it and use their signature accent, exactly as the script does.
export function resolveTheme(
  skin: Skin,
  scheme: Scheme,
  accentHex?: string,
): ThemeTokens {
  const dark = scheme === "dark";
  const n = dark ? NEUTRALS_DARK : NEUTRALS_LIGHT;
  const cobalt = accentHex ?? (dark ? COBALT_DARK : COBALT_LIGHT);

  const base = {
    skin,
    scheme,
    dark,
    bg: n.bg,
    surface: n.surface,
    surface2: n.surface2,
    text: n.text,
    dim: n.dim,
    border: n.border,
  };

  if (skin === "editorial") {
    return {
      ...base,
      accent: cobalt,
      accentInk: contrastOn(cobalt), // AA-safe (script hardcodes #fff; we contrast-check)
      accentBg: cobalt,
      ground: { kind: "solid", color: n.bg },
      screenBase: n.bg,
      cardBg: dark ? n.surface : "#FFFFFF",
      cardBorder: { width: 1, color: n.border },
      tileBg: dark ? n.surface : "#FAFAFB",
      tileBorder: { width: 1, color: n.border },
      radius: 16,
      btnRadius: 999,
      shadow: null,
      fontBody: bodyFont("editorial"),
      displayFont: FONT.playfair,
      displayItalic: FONT.playfairItalic,
      numFont: undefined,
    };
  }

  if (skin === "collage") {
    const accent = dark ? "#FF4FB0" : "#FF2E93";
    const line = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const gridBase = dark ? "#161618" : "#F5F2EE";
    const hard = dark ? "#000000" : "#141414";
    const wash: Wash = dark
      ? {
          colors: ["rgba(22,22,24,0)", "rgba(255,46,147,0.16)", "rgba(0,0,0,0.55)"],
          locations: [0, 0.55, 1],
        }
      : {
          colors: ["rgba(245,242,238,0)", "rgba(255,46,147,0.10)", "rgba(255,46,147,0.22)"],
          locations: [0, 0.6, 1],
        };
    return {
      ...base,
      accent,
      accentInk: "#FFFFFF",
      accentBg: accent,
      ground: { kind: "grid", base: gridBase, line, cell: 22, wash },
      screenBase: gridBase,
      cardBg: dark ? "#232326" : "#FFFFFF",
      cardBorder: { width: 1.5, color: hard },
      tileBg: dark ? "#232326" : "#FFFFFF",
      tileBorder: { width: 1.5, color: hard },
      radius: 6,
      btnRadius: 6,
      shadow: { dx: 3, dy: 3, color: hard },
      fontBody: bodyFont("collage"),
      displayFont: FONT.archivoBlack,
      numFont: FONT.archivoBold,
    };
  }

  // poster — the screen IS the cobalt field; text is cream; cards are deeper blue.
  const field = dark ? "#182a7a" : "#2547C6";
  const accent = dark ? "#9DB0FF" : "#EFE7DB";
  return {
    ...base,
    text: "#EFE7DB",
    dim: "rgba(239,231,219,0.72)",
    accent,
    accentInk: field,
    accentBg: "#EFE7DB",
    ground: { kind: "field", color: field },
    screenBase: field,
    cardBg: dark ? "#101f5e" : "#1C3AAE",
    cardBorder: null,
    tileBg: dark ? "#101f5e" : "#1C3AAE",
    tileBorder: null,
    radius: 2,
    btnRadius: 2,
    shadow: null,
    fontBody: bodyFont("poster"),
    displayFont: FONT.anton,
    scriptFont: FONT.greatVibes,
    numFont: FONT.archivoBold,
  };
}

// --- Responsive display type scale (replaces the export's clamp() sizes). ---
export type Breakpoint = "phone" | "tablet" | "desktop";
export function breakpoint(width: number): Breakpoint {
  if (width >= 1024) return "desktop";
  if (width >= 700) return "tablet";
  return "phone";
}
export const DISPLAY_SCALE: Record<"xl" | "lg" | "md", Record<Breakpoint, number>> = {
  xl: { phone: 34, tablet: 44, desktop: 52 },
  lg: { phone: 26, tablet: 32, desktop: 38 },
  md: { phone: 20, tablet: 24, desktop: 28 },
};
export function displaySize(role: "xl" | "lg" | "md", width: number): number {
  return DISPLAY_SCALE[role][breakpoint(width)];
}

// Flatten an rgba() colour over a solid background → a solid hex (for CSS-var
// bridges that can't carry alpha, e.g. poster's translucent `dim`).
function toSolidHex(color: string, over: string): string {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return color.startsWith("#") ? color : over;
  const p = m[1].split(",").map((x) => parseFloat(x.trim()));
  const a = p[3] ?? 1;
  const [br, bg, bb] = [1, 3, 5].map((i) => parseInt(over.replace("#", "").slice(i - 1, i + 1), 16));
  const mix = (c: number, b: number) => Math.round(c * a + b * (1 - a));
  const hex = (v: number) => v.toString(16).padStart(2, "0");
  return ("#" + hex(mix(p[0], br)) + hex(mix(p[1], bg)) + hex(mix(p[2], bb))).toUpperCase();
}

// Resolve a token colour to a solid hex (for CSS-var bridges), flattening rgba
// over the token's screen base.
export function solid(t: ThemeTokens, color: string): string {
  return color.startsWith("#") ? color : toSolidHex(color, t.screenBase);
}

// The neutral CSS-variable map for a token set (drives the Tailwind neutral
// classes on un-migrated screens). The accent vars are set separately by the
// ThemeProvider (they carry the picker's outlined-when-invisible behaviour).
export function tokenNeutralVars(t: ThemeTokens): Record<string, string> {
  const hsl = (c: string) => hexToHslTriplet(solid(t, c));
  const borderColor = t.cardBorder?.color ?? t.border;
  return {
    "--background": hsl(t.screenBase),
    "--foreground": hsl(t.text),
    "--card": hsl(t.cardBg),
    "--card-foreground": hsl(t.text),
    "--popover": hsl(t.cardBg),
    "--popover-foreground": hsl(t.text),
    "--secondary": hsl(t.tileBg),
    "--secondary-foreground": hsl(t.text),
    "--muted": hsl(t.tileBg),
    "--muted-foreground": hsl(t.dim),
    "--border": hsl(borderColor),
    "--input": hsl(borderColor),
    "--radius": `${t.radius}px`,
  };
}
