import { Platform } from "react-native";

// Trippl — design tokens (Phase 10, decisions.md D11 resolved; see docs/design.md).
// Neutral tokens live as CSS variables in global.css; these mirrors exist for code
// that can't read CSS vars (React Navigation, react-native-view-shot, etc.).

export const APP_NAME = "Trippl";

// --- Neutral palette (Apple-like; dark base is dark grey, NOT pure black) ---
export const NEUTRALS = {
  light: {
    bg: "#FFFFFF",
    surface: "#F5F5F7",
    text: "#000000",
    textSecondary: "#6E6E73",
    border: "#E5E5EA",
  },
  dark: {
    bg: "#1C1C1E",
    surface: "#2C2C2E",
    text: "#FFFFFF",
    textSecondary: "#AEAEB2",
    border: "#38383A",
  },
} as const;

// --- Accent presets. Default = Black (mode-aware monochrome). ---
// Black & White are mode-aware (their light/dark values flip) so the monochrome
// accents auto-flip to stay visible. Chromatic accents keep their true vivid
// value in both modes. `light` is the stored/lookup key (unique per preset).
export type AccentPreset = {
  id: string;
  name: string;
  light: string;
  dark: string;
};

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "cobalt", name: "Cobalt", light: "#2547C6", dark: "#6E8CFF" }, // default (design system)
  { id: "black", name: "Black", light: "#000000", dark: "#FFFFFF" }, // mode-aware mono
  { id: "white", name: "White", light: "#FFFFFF", dark: "#000000" }, // inverse
  { id: "red", name: "Red", light: "#FF3B30", dark: "#FF453A" },
  { id: "orange", name: "Orange", light: "#FF9500", dark: "#FF9F0A" },
  { id: "yellow", name: "Yellow", light: "#FFCC00", dark: "#FFD60A" },
  { id: "green", name: "Green", light: "#34C759", dark: "#30D158" },
  { id: "blue", name: "Blue", light: "#007AFF", dark: "#0A84FF" },
  { id: "purple", name: "Purple", light: "#AF52DE", dark: "#BF5AF2" },
  { id: "pink", name: "Pink", light: "#FF2D55", dark: "#FF375F" },
];

export type ThemeMode = "light" | "dark" | "system";

// Default = Cobalt, mode-aware (#2547C6 light / #6E8CFF dark) — the design system
// default (supersedes the old Black default; see docs/decisions.md D11 override).
export const DEFAULT_ACCENT = "#2547C6";
export const DEFAULT_MODE: ThemeMode = "system";

// Resolve the accent's raw variant for a scheme: preset → its light/dark hex; a
// custom hex → used as-is for both.
export function accentForScheme(
  accent: string,
  scheme: "light" | "dark",
): string {
  const preset = ACCENT_PRESETS.find(
    (p) => p.light.toLowerCase() === accent.toLowerCase(),
  );
  if (preset) return scheme === "dark" ? preset.dark : preset.light;
  return accent;
}

function rgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

// Readable foreground (black/white) for text/icons sitting ON the accent fill.
export function contrastOn(hex: string): string {
  if (hex.replace("#", "").length < 6) return "#FFFFFF";
  const [r, g, b] = rgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#FFFFFF";
}

// Is the accent essentially the current background (e.g. White accent in light,
// or a near-bg custom hex)? Uses RGB distance so vivid-but-light colors (Yellow)
// are NOT flagged — only colors that would vanish against the bg.
function isNearBackground(hex: string, scheme: "light" | "dark"): boolean {
  if (hex.replace("#", "").length < 6) return false;
  const [r1, g1, b1] = rgb(hex);
  const [r2, g2, b2] = rgb(NEUTRALS[scheme].bg);
  const dist = Math.sqrt(
    (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2,
  );
  return dist < 60;
}

// The three accent values the UI needs, given the stored accent + scheme:
//  - fill: solid button/badge background ("transparent" → outlined, for accents
//          that would vanish against the bg, i.e. White / near-bg customs).
//  - ink:  the accent as text / stroke / border — always visible.
//  - fg:   label color sitting on the fill (contrast-checked).
export function resolveAccentVars(
  accent: string,
  scheme: "light" | "dark",
): { fill: string; ink: string; fg: string } {
  const raw = accentForScheme(accent, scheme);
  const text = NEUTRALS[scheme].text;
  if (isNearBackground(raw, scheme)) {
    return { fill: "transparent", ink: text, fg: text }; // outlined / inverse
  }
  return { fill: raw, ink: raw, fg: contrastOn(raw) }; // solid
}

export function isValidHex(s: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(s.trim());
}

export function normalizeHex(s: string): string {
  const t = s.trim();
  return (t.startsWith("#") ? t : `#${t}`).toUpperCase();
}

// --- Type scale (two roles, Apple-like: Display for headers, Text for body) ---
export const TYPE = {
  displayXl: { fontSize: 40, lineHeight: 44, fontWeight: "700" as const, letterSpacing: -1 },
  displayLg: { fontSize: 30, lineHeight: 36, fontWeight: "700" as const, letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const, letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" as const, letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const, letterSpacing: 0 },
} as const;

// --- Fonts: system primary (real SF on Apple); bundled Inter fallback on
// Android. Web uses the CSS font stack in global.css (Apple → SF, else Inter). ---
export type FontWeight = "regular" | "medium" | "semibold" | "bold";

const INTER: Record<FontWeight, string> = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};

export const INTER_FONTS = INTER;

// The fontFamily to apply. iOS/web → undefined (system / CSS stack); Android →
// the matching Inter weight so text stays consistent.
export function fontFamily(weight: FontWeight = "regular"): string | undefined {
  return Platform.OS === "android" ? INTER[weight] : undefined;
}

// --- React Navigation theme mirror (nav header/background) ---
export const NAV_THEME = {
  light: {
    background: NEUTRALS.light.bg,
    card: NEUTRALS.light.bg,
    text: NEUTRALS.light.text,
    border: NEUTRALS.light.border,
    notification: DEFAULT_ACCENT,
  },
  dark: {
    background: NEUTRALS.dark.bg,
    card: NEUTRALS.dark.bg,
    text: NEUTRALS.dark.text,
    border: NEUTRALS.dark.border,
    notification: DEFAULT_ACCENT,
  },
} as const;
