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

// --- WCAG contrast helpers (self-contained so this leaf module needs no imports;
// the destination-theme path has its own copy in lib/theme-color.ts). ---
function relLum([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a: string, b: string): number {
  const l1 = relLum(rgb(a)),
    l2 = relLum(rgb(b));
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2; const d = mx - mn;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const hx = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255))).toString(16).padStart(2, "0");
  return `#${hx(r)}${hx(g)}${hx(b)}`.toUpperCase();
}

// Readable foreground (black/white) for text/icons sitting ON the accent fill.
// Prefer white (the conventional look on colored buttons); fall back to black
// only when white wouldn't meet WCAG AA for large text (≥3:1) — e.g. on green.
export function contrastOn(hex: string): string {
  if (hex.replace("#", "").length < 6) return "#FFFFFF";
  return ratio("#FFFFFF", hex) >= 3.0 ? "#FFFFFF" : "#000000";
}

// Clamp an accent used as INK (text / stroke / small graphics) so it meets a
// readable contrast on `bg`, preserving hue + saturation (light bg → darken,
// dark bg → lighten). Vivid picker accents (yellow/green/…) that would be
// illegible as text on white are darkened to AA; already-fine accents pass
// through unchanged. Fills stay raw — their label uses contrastOn().
export function readableInk(hex: string, bg: string, target = 4.5): string {
  if (hex.replace("#", "").length < 6) return hex;
  if (ratio(hex, bg) >= target) return hex;
  const [h, s, l0] = rgbToHsl(rgb(hex));
  const darken = relLum(rgb(bg)) > 0.5;
  let l = Math.max(0.05, Math.min(0.95, l0)), guard = 0;
  while (ratio(hslToHex(h, s, l), bg) < target && guard < 120) {
    l += darken ? -0.02 : 0.02;
    if (l <= 0.04 || l >= 0.96) break;
    guard++;
  }
  return hslToHex(h, s, Math.max(0.05, Math.min(0.95, l)));
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
  // Solid: the fill stays the raw accent (its label uses fg=contrastOn), but the
  // INK (accent-as-text / stroke) is clamped to AA against the bg so a vivid light
  // accent (yellow, green, …) stays legible as accent-colored text.
  return { fill: raw, ink: readableInk(raw, NEUTRALS[scheme].bg, 4.5), fg: contrastOn(raw) };
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
