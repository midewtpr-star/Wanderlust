import { NEUTRALS, contrastOn } from "@/constants/theme";

// Color math + WCAG contrast for destination themes. Generated colors NEVER touch
// neutrals (bg/surface/text/border) — they only drive the accent layer, and every
// one is clamped to a readable contrast against the current mode's background
// before use, in BOTH light and dark.

export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    s = s
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return "#" + s.toUpperCase();
}

export function hexToRgb(hex: string): [number, number, number] {
  const s = hex.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

function toHex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

export function rgbToHex(r: number, g: number, b: number): string {
  return ("#" + toHex2(r) + toHex2(g) + toHex2(b)).toUpperCase();
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return [h, s, l];
}

export function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function channel(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function relLuminance(r: number, g: number, b: number): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relLuminance(...hexToRgb(hex1));
  const l2 = relLuminance(...hexToRgb(hex2));
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// Adjust ONLY the lightness of `hex` until it meets `target` contrast against
// `bg`, preserving hue + saturation so the color keeps its character. Light bg →
// darken; dark bg → lighten. Clamped so it never becomes pure black/white.
export function adjustLightnessForContrast(
  hex: string,
  bg: string,
  target: number,
): string {
  const [h, s, l0] = rgbToHsl(...hexToRgb(hex));
  const darken = relLuminance(...hexToRgb(bg)) > 0.5;
  let l = l0;
  const at = (ll: number) => rgbToHex(...hslToRgb(h, s, ll));
  let guard = 0;
  while (contrastRatio(at(l), bg) < target && guard < 120) {
    l += darken ? -0.015 : 0.015;
    if (l <= 0.03 || l >= 0.97) break;
    guard++;
  }
  return at(Math.max(0.05, Math.min(0.95, l)));
}

// The three accent values a destination theme needs for a scheme, contrast-safe:
//  - ink:  text / stroke / border (`--accent`) — ≥ 4.5:1 vs bg (AA text).
//  - fill: solid button/badge background (`--accent-fill`) — ≥ 3:1 vs bg so the
//          control is clearly visible.
//  - fg:   label color on the fill (contrast-checked black/white).
// Returns null for an invalid color so the caller falls back to the Trippl accent.
export function resolveThemeAccent(
  primary: string,
  scheme: "light" | "dark",
): { ink: string; fill: string; fg: string } | null {
  const p = normalizeHex(primary);
  if (!p) return null;
  const bg = NEUTRALS[scheme].bg;
  const ink = adjustLightnessForContrast(p, bg, 4.5);
  const fill = adjustLightnessForContrast(p, bg, 3.0);
  return { ink, fill, fg: contrastOn(fill) };
}

// Derive a pleasant secondary (hue-rotated) + a light surface tint from a primary
// (used for manual overrides / when only a primary was extracted).
export function deriveSecondary(primary: string): string {
  const p = normalizeHex(primary) ?? "#000000";
  const [h, s] = rgbToHsl(...hexToRgb(p));
  return rgbToHex(...hslToRgb((h + 150) % 360, Math.min(1, s * 0.9 + 0.1), 0.5));
}

export function deriveTint(primary: string): string {
  const p = normalizeHex(primary) ?? "#000000";
  const [h, s] = rgbToHsl(...hexToRgb(p));
  return rgbToHex(...hslToRgb(h, Math.min(0.5, s), 0.94));
}

// A subtle rgba wash from a hex, for surface tint / motif overlays.
export function rgba(hex: string, alpha: number): string {
  const p = normalizeHex(hex);
  if (!p) return `rgba(0,0,0,${alpha})`;
  const [r, g, b] = hexToRgb(p);
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;
}
