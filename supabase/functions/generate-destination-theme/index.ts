// Trippl — generate-destination-theme edge function (Deno).
//
// Produces a destination palette { primary, secondary, surface_tint, motif } for
// a trip, from two server-side sources (the client handles the curated map):
//   1. COVER IMAGE — if a cover_url is given, extract vibrant colors from it
//      (imagescript). The host picked that image, so it's the most on-brand.
//   2. LLM FALLBACK — otherwise (or if extraction is weak) ask a model for a
//      palette for the destination, via forced tool-use → strict JSON. Reuses the
//      ANTHROPIC_API_KEY secret (server-only).
//
// Never throws into the client: any failure returns { ok:false } so the client
// falls back to the curated map or the default Trippl accent.
//
// Deploy:  supabase functions deploy generate-destination-theme
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   (for the LLM path)

import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const ANTHROPIC_MODEL = "claude-opus-4-8";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const MOTIFS = [
  "artdeco",
  "alpine",
  "citynight",
  "tropical",
  "coastal",
  "desert",
  "vineyard",
  "historic",
  "mountain",
  "rainforest",
  "jazz",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Theme = {
  primary: string;
  secondary: string;
  surface_tint: string;
  motif: string;
  source: "cover_image" | "generated";
};

function json(body: { ok: boolean; theme?: Theme }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- color helpers ----------------------------------------------------------
function toHex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}
function rgbToHex(r: number, g: number, b: number): string {
  return ("#" + toHex2(r) + toHex2(g) + toHex2(b)).toUpperCase();
}
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
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
function tintOf(hex: string): string {
  const [h, s] = rgbToHsv(
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  );
  // very light, low-saturation wash
  return rgbToHex(...hsvToRgb(h, Math.min(0.14, s), 0.97));
}
function motifFromHue(h: number): string {
  if (h < 20 || h >= 340) return "tropical";
  if (h < 45) return "coastal";
  if (h < 70) return "jazz";
  if (h < 160) return "rainforest";
  if (h < 200) return "coastal";
  if (h < 255) return "coastal";
  if (h < 300) return "jazz";
  return "artdeco";
}

// --- cover-image extraction (best-effort) -----------------------------------
async function extractFromCover(url: string): Promise<Theme | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const image = await Image.decode(bytes);
    const small = image.resize(64, Image.RESIZE_AUTO);

    // Weighted hue buckets (skip greys + near-black/white); score by vibrancy.
    const buckets = new Map<
      number,
      { score: number; r: number; g: number; b: number }
    >();
    for (const [, , color] of small.iterateWithColors()) {
      const [r, g, b, a] = Image.colorToRGBA(color);
      if (a < 200) continue;
      const [h, s, v] = rgbToHsv(r, g, b);
      if (v < 0.15 || v > 0.97 || s < 0.2) continue;
      const key = Math.round(h / 20) % 18;
      const w = s * (0.55 + 0.45 * v);
      const cur = buckets.get(key) ?? { score: 0, r: 0, g: 0, b: 0 };
      cur.score += w;
      cur.r += r * w;
      cur.g += g * w;
      cur.b += b * w;
      buckets.set(key, cur);
    }
    const ranked = [...buckets.values()].sort((x, y) => y.score - x.score);
    if (ranked.length === 0) return null;

    const avg = (x: { score: number; r: number; g: number; b: number }) =>
      rgbToHex(x.r / x.score, x.g / x.score, x.b / x.score);
    const primary = avg(ranked[0]);
    const secondary = ranked[1] ? avg(ranked[1]) : primary;
    const [ph] = rgbToHsv(
      parseInt(primary.slice(1, 3), 16),
      parseInt(primary.slice(3, 5), 16),
      parseInt(primary.slice(5, 7), 16),
    );
    return {
      primary,
      secondary,
      surface_tint: tintOf(primary),
      motif: motifFromHue(ph),
      source: "cover_image",
    };
  } catch (_e) {
    return null;
  }
}

// --- LLM fallback (forced tool → strict JSON) -------------------------------
async function llmTheme(
  apiKey: string,
  destination: string,
): Promise<Theme | null> {
  const tool = {
    name: "record_palette",
    description: "Record a tasteful UI accent palette that evokes a destination.",
    input_schema: {
      type: "object",
      properties: {
        primary: { type: "string", description: "Vivid accent hex like #RRGGBB that evokes the place." },
        secondary: { type: "string", description: "A complementary vivid accent hex #RRGGBB." },
        surface_tint: { type: "string", description: "A very light, near-white tint hex #RRGGBB (a soft wash of the primary)." },
        motif: { type: "string", enum: MOTIFS, description: "One word describing the vibe." },
      },
      required: ["primary", "secondary", "surface_tint", "motif"],
    },
  };
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 512,
        tools: [tool],
        tool_choice: { type: "tool", name: "record_palette" },
        messages: [
          {
            role: "user",
            content:
              `A trip to "${destination}". Give a UI accent palette that instantly ` +
              `feels like this place — bold, saturated primary + secondary that a ` +
              `local would recognize, plus a very light surface tint and a one-word ` +
              `motif. Use the record_palette tool.`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("Anthropic error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const use = (data.content ?? []).find(
      (b: { type: string }) => b.type === "tool_use",
    );
    if (!use) return null;
    const p = use.input as {
      primary: string;
      secondary: string;
      surface_tint: string;
      motif: string;
    };
    const hex = /^#[0-9a-fA-F]{6}$/;
    if (!hex.test(p.primary) || !hex.test(p.secondary) || !hex.test(p.surface_tint)) {
      return null;
    }
    return {
      primary: p.primary.toUpperCase(),
      secondary: p.secondary.toUpperCase(),
      surface_tint: p.surface_tint.toUpperCase(),
      motif: MOTIFS.includes(p.motif) ? p.motif : "coastal",
      source: "generated",
    };
  } catch (e) {
    console.error("llmTheme error", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false }, 401);

    const { destination, cover_url } = await req.json().catch(() => ({}));

    // 1) Cover image first (most on-brand).
    if (cover_url && typeof cover_url === "string") {
      const fromCover = await extractFromCover(cover_url);
      if (fromCover) return json({ ok: true, theme: fromCover });
    }

    // 2) LLM fallback for the destination.
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (apiKey && destination && typeof destination === "string") {
      const fromLlm = await llmTheme(apiKey, destination);
      if (fromLlm) return json({ ok: true, theme: fromLlm });
    }

    // Nothing worked → let the client fall back (curated map / default accent).
    return json({ ok: false }, 200);
  } catch (err) {
    console.error("generate-destination-theme error", err);
    return json({ ok: false }, 200);
  }
});
