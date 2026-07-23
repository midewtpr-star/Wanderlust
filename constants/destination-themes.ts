// Trippl — curated destination palettes (source #2, after cover-image extraction,
// before the LLM fallback). Hand-picked so well-known places feel right instantly,
// offline, with zero network. Colors are vivid on purpose — they're contrast-
// clamped to the accent layer at use (lib/theme-color.ts). See docs/design.md.

export type MotifKey =
  | "artdeco"
  | "alpine"
  | "citynight"
  | "tropical"
  | "coastal"
  | "desert"
  | "vineyard"
  | "historic"
  | "mountain"
  | "rainforest"
  | "jazz";

export type CuratedTheme = {
  primary: string;
  secondary: string;
  surface_tint: string;
  motif: MotifKey;
};

// Keyed by a normalized city name (lowercase, no state/country). Popular US trip
// spots first; extend freely.
const CURATED: Record<string, CuratedTheme> = {
  miami: { primary: "#FF2D95", secondary: "#12B5C9", surface_tint: "#FFE6F2", motif: "artdeco" },
  "miami beach": { primary: "#FF2D95", secondary: "#12B5C9", surface_tint: "#FFE6F2", motif: "artdeco" },
  aspen: { primary: "#3B7DD8", secondary: "#2F6B4F", surface_tint: "#E9F1FA", motif: "alpine" },
  vail: { primary: "#2E7DC4", secondary: "#2F6B4F", surface_tint: "#E7F1F9", motif: "alpine" },
  "park city": { primary: "#3574C6", secondary: "#345E45", surface_tint: "#E8F0FA", motif: "alpine" },
  "lake tahoe": { primary: "#2E7DC4", secondary: "#2F6B4F", surface_tint: "#E7F1F9", motif: "alpine" },
  tahoe: { primary: "#2E7DC4", secondary: "#2F6B4F", surface_tint: "#E7F1F9", motif: "alpine" },
  tokyo: { primary: "#FF2E4D", secondary: "#3B3B98", surface_tint: "#F3E7EC", motif: "citynight" },
  "new orleans": { primary: "#7A3FF2", secondary: "#F2B705", surface_tint: "#F1EAFB", motif: "jazz" },
  nola: { primary: "#7A3FF2", secondary: "#F2B705", surface_tint: "#F1EAFB", motif: "jazz" },
  "new york": { primary: "#2E6BE6", secondary: "#E5484D", surface_tint: "#EAEFFB", motif: "citynight" },
  "new york city": { primary: "#2E6BE6", secondary: "#E5484D", surface_tint: "#EAEFFB", motif: "citynight" },
  nyc: { primary: "#2E6BE6", secondary: "#E5484D", surface_tint: "#EAEFFB", motif: "citynight" },
  "los angeles": { primary: "#FF6B5B", secondary: "#14B8A6", surface_tint: "#FFEBE7", motif: "coastal" },
  la: { primary: "#FF6B5B", secondary: "#14B8A6", surface_tint: "#FFEBE7", motif: "coastal" },
  "las vegas": { primary: "#E5308A", secondary: "#F5C518", surface_tint: "#FBE7F1", motif: "citynight" },
  vegas: { primary: "#E5308A", secondary: "#F5C518", surface_tint: "#FBE7F1", motif: "citynight" },
  "san francisco": { primary: "#E4572E", secondary: "#5B82A8", surface_tint: "#FBE9E2", motif: "coastal" },
  "san diego": { primary: "#17B6C9", secondary: "#FBB13C", surface_tint: "#E2F6F9", motif: "coastal" },
  chicago: { primary: "#1F6FEB", secondary: "#D7263D", surface_tint: "#E7EFFB", motif: "citynight" },
  seattle: { primary: "#2F7D5B", secondary: "#4A7FB5", surface_tint: "#E8F2EC", motif: "rainforest" },
  portland: { primary: "#2F7D5B", secondary: "#E4568A", surface_tint: "#E8F2EC", motif: "rainforest" },
  austin: { primary: "#F2711C", secondary: "#17A2B8", surface_tint: "#FCEDE0", motif: "jazz" },
  nashville: { primary: "#E0A500", secondary: "#3F6FB0", surface_tint: "#FBF1D6", motif: "jazz" },
  denver: { primary: "#2E6BB8", secondary: "#C25B34", surface_tint: "#E6EEF8", motif: "mountain" },
  "jackson hole": { primary: "#3A6EA5", secondary: "#B5532A", surface_tint: "#E8EFF7", motif: "mountain" },
  honolulu: { primary: "#08B0A0", secondary: "#FF5A8A", surface_tint: "#E1F6F3", motif: "tropical" },
  hawaii: { primary: "#08B0A0", secondary: "#FF5A8A", surface_tint: "#E1F6F3", motif: "tropical" },
  maui: { primary: "#0FB3B0", secondary: "#FF7A59", surface_tint: "#E1F6F5", motif: "tropical" },
  "key west": { primary: "#10B7C7", secondary: "#FF7A59", surface_tint: "#E1F6F9", motif: "tropical" },
  cancun: { primary: "#12C2C2", secondary: "#FF7A59", surface_tint: "#E1F8F8", motif: "tropical" },
  "cabo san lucas": { primary: "#2FA4C4", secondary: "#E0B15E", surface_tint: "#E5F4F9", motif: "coastal" },
  cabo: { primary: "#2FA4C4", secondary: "#E0B15E", surface_tint: "#E5F4F9", motif: "coastal" },
  orlando: { primary: "#7B4DEA", secondary: "#22C1C3", surface_tint: "#EFE9FB", motif: "tropical" },
  "palm springs": { primary: "#FF6F91", secondary: "#1EC8B0", surface_tint: "#FFE9EE", motif: "desert" },
  scottsdale: { primary: "#C6482D", secondary: "#3E8E5A", surface_tint: "#F7E6E0", motif: "desert" },
  phoenix: { primary: "#C6482D", secondary: "#3E8E5A", surface_tint: "#F7E6E0", motif: "desert" },
  "santa fe": { primary: "#C86B3C", secondary: "#33A6A0", surface_tint: "#F6E8DE", motif: "desert" },
  charleston: { primary: "#4FB0A5", secondary: "#F2A65A", surface_tint: "#E6F5F2", motif: "historic" },
  savannah: { primary: "#6B8E4E", secondary: "#D8A93B", surface_tint: "#EEF2E4", motif: "historic" },
  napa: { primary: "#7B2D43", secondary: "#5B8C3E", surface_tint: "#F3E5E9", motif: "vineyard" },
  sonoma: { primary: "#7B2D43", secondary: "#5B8C3E", surface_tint: "#F3E5E9", motif: "vineyard" },
  boston: { primary: "#C1272D", secondary: "#2B5B8A", surface_tint: "#F7E4E5", motif: "historic" },
  "washington dc": { primary: "#2B4B8C", secondary: "#C9B37E", surface_tint: "#E6EAF3", motif: "historic" },
  "washington, dc": { primary: "#2B4B8C", secondary: "#C9B37E", surface_tint: "#E6EAF3", motif: "historic" },
};

// Normalize a free-text destination to a lookup key: lowercase, drop everything
// after the first comma (state/country), collapse whitespace.
export function normalizeDestination(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .split(",")[0]
    .replace(/\s+/g, " ")
    .trim();
}

// Curated palette for a destination, or null if it isn't in the map.
export function curatedTheme(destination: string | null | undefined): CuratedTheme | null {
  const key = normalizeDestination(destination);
  if (!key) return null;
  if (CURATED[key]) return CURATED[key];
  // Loose fallback: a known city name contained in the string (e.g. "Downtown Miami").
  for (const name of Object.keys(CURATED)) {
    if (key.includes(name)) return CURATED[name];
  }
  return null;
}
