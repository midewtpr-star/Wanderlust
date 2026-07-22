import { Platform } from "react-native";

// Calor — design tokens (Phase 10, decisions.md D11 resolved; see docs/design.md).
// Neutral tokens live as CSS variables in global.css; these mirrors exist for code
// that can't read CSS vars (React Navigation, react-native-view-shot, etc.).

export const APP_NAME = "Calor";

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

// --- Accent presets (light + dark variant each; default = Red) ---
export type AccentPreset = {
  id: string;
  name: string;
  light: string;
  dark: string;
};

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "red", name: "Red", light: "#FF3B30", dark: "#FF453A" },
  { id: "blue", name: "Blue", light: "#007AFF", dark: "#0A84FF" },
  { id: "green", name: "Green", light: "#34C759", dark: "#30D158" },
  { id: "yellow", name: "Yellow", light: "#FFCC00", dark: "#FFD60A" },
];

export type ThemeMode = "light" | "dark" | "system";

export const DEFAULT_ACCENT = ACCENT_PRESETS[0].light; // Red
export const DEFAULT_MODE: ThemeMode = "system";

// Resolve the accent's variant for a scheme: preset → its light/dark hex; a
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

// Readable foreground (black/white) for text/icons sitting ON the accent.
export function contrastOn(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#FFFFFF";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#FFFFFF";
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
