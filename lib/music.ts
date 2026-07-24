// Music-on-shares (Release 2 · B6). A SWAPPABLE catalogue provider — the operator
// plugs in a CLEARED / licensed catalogue; the app ships with none configured (a
// clear "not configured" state) and NEVER accepts Spotify/Apple/commercial-audio
// uploads. Pure module: the provider interface, the config-driven registry, an
// example (audio-less) catalogue for exercising the UI, and the trim math.

export type Track = {
  id: string;
  title: string;
  artist: string;
  durationMs: number;
  previewUrl: string | null; // a CLEARED preview stream; null = metadata only (no playback)
  license: string; // human-readable rights, retained in the export metadata
  providerId: string;
};

// A catalogue source. Implementations must return only cleared/licensed tracks.
export interface MusicCatalogProvider {
  id: string;
  name: string;
  licenseNote: string; // shown to the user: where tracks come from + their rights
  list(): Promise<Track[]>;
  search(query: string): Promise<Track[]>;
}

// --- Trim (Instagram-style 15s clip) — pure, testable ---
export const DEFAULT_CLIP_MS = 15_000;

export function clampTrimStart(startMs: number, durationMs: number, clipMs = DEFAULT_CLIP_MS): number {
  const maxStart = Math.max(0, durationMs - clipMs);
  if (!Number.isFinite(startMs)) return 0;
  return Math.min(Math.max(0, Math.round(startMs)), maxStart);
}

export function clipEnd(startMs: number, durationMs: number, clipMs = DEFAULT_CLIP_MS): number {
  return Math.min(clampTrimStart(startMs, durationMs, clipMs) + clipMs, durationMs);
}

export function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// --- Provider registry ---
// The operator selects a provider via EXPO_PUBLIC_MUSIC_PROVIDER. Unset (or an
// unknown value) → not configured, which is the shipped default. The only
// built-in is an EXAMPLE catalogue (no audio) for demoing the picker; real
// cleared providers are registered here by the operator.
// Exported so the operator can reference it and the dev harness can demo the
// configured picker. Enable it app-wide via EXPO_PUBLIC_MUSIC_PROVIDER=example.
export const EXAMPLE_PROVIDER: MusicCatalogProvider = {
  id: "example",
  name: "Example catalogue",
  licenseNote: "Example entries only (no audio). Configure a cleared provider to enable playback.",
  list: async () => EXAMPLE_TRACKS,
  search: async (q) => {
    const s = q.trim().toLowerCase();
    if (!s) return EXAMPLE_TRACKS;
    return EXAMPLE_TRACKS.filter(
      (t) => t.title.toLowerCase().includes(s) || t.artist.toLowerCase().includes(s),
    );
  },
};

const EXAMPLE_TRACKS: Track[] = [
  { id: "ex1", title: "Coastline Drive", artist: "Public Domain Ensemble", durationMs: 168_000, previewUrl: null, license: "CC0 (example)", providerId: "example" },
  { id: "ex2", title: "Golden Hour", artist: "Open Audio Collective", durationMs: 201_000, previewUrl: null, license: "CC0 (example)", providerId: "example" },
  { id: "ex3", title: "Night Market", artist: "Open Audio Collective", durationMs: 154_000, previewUrl: null, license: "CC0 (example)", providerId: "example" },
  { id: "ex4", title: "Altitude", artist: "Public Domain Ensemble", durationMs: 223_000, previewUrl: null, license: "CC0 (example)", providerId: "example" },
  { id: "ex5", title: "Salt & Sun", artist: "Free Sound Guild", durationMs: 176_000, previewUrl: null, license: "CC0 (example)", providerId: "example" },
  { id: "ex6", title: "Last Night in Town", artist: "Free Sound Guild", durationMs: 191_000, previewUrl: null, license: "CC0 (example)", providerId: "example" },
];

const CONFIGURED = process.env.EXPO_PUBLIC_MUSIC_PROVIDER ?? null;

// The active provider, or null when nothing is configured (the shipped default).
export function getMusicProvider(): MusicCatalogProvider | null {
  if (CONFIGURED === "example") return EXAMPLE_PROVIDER;
  // Operators register their cleared provider(s) here, e.g.:
  //   if (CONFIGURED === "acme") return ACME_PROVIDER;
  return null;
}

export function musicConfigured(): boolean {
  return getMusicProvider() !== null;
}
