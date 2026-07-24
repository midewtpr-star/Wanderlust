// Trippl — link-preview edge function (Deno).
//
// Returns a normalized preview { ok, url, title, image_url, author, provider }
// for a pasted Pinterest pin/board link, or ANY other web link, so the outfit
// planner can render a rich card without the client hitting CORS. Results are
// cached in the `link_previews` table (service role). Failures (timeout, blocked
// scrape, non-HTML) resolve to a minimal payload with ok=false — never a throw —
// so the UI can fall back to the raw link + a placeholder.
//
// MVP deliberately does NOT use the official Pinterest API (OAuth-gated + app
// review). It uses Pinterest's public oEmbed endpoint with an OpenGraph scrape
// fallback, which also covers any non-Pinterest link.
//
// ── PINTEREST OAUTH SEAM ──────────────────────────────────────────────────────
// Later: connect a user's Pinterest account via OAuth to browse their own
// boards/pins in-app and import directly (Pinterest API v5 + app review). Build
// nothing for OAuth now — this function stays the link/preview path.
// ──────────────────────────────────────────────────────────────────────────────
//
// Deploy:  supabase functions deploy link-preview
// Secrets: none required.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FETCH_TIMEOUT_MS = 8000;
const UA =
  "Mozilla/5.0 (compatible; TripplBot/1.0; +https://trippl.app) link-preview";

type Preview = {
  ok: boolean;
  url: string | null;
  title: string | null;
  image_url: string | null;
  author: string | null;
  provider: string; // 'pinterest' | 'link'
};

function json(body: Preview, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function providerFor(url: string): string {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes("pinterest.") || h === "pin.it" || h.endsWith(".pin.it")) {
      return "pinterest";
    }
    return "link";
  } catch {
    return "link";
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

// Pull the content of the first matching <meta property|name="key"> tag.
function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const esc = key.replace(/[:]/g, "\\$&");
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${esc}["'][^>]*content=["']([^"']+)["']`,
      "i",
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${esc}["']`,
      "i",
    );
    const m = html.match(re1) ?? html.match(re2);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decodeEntities(m[1].trim()) : null;
}

async function fetchText(
  url: string,
): Promise<{ html: string; finalUrl: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return null; // not a scrapeable page
    return { html: await res.text(), finalUrl: res.url || url };
  } catch {
    return null; // timeout / network / blocked
  } finally {
    clearTimeout(timer);
  }
}

async function pinterestOEmbed(url: string): Promise<Preview | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      "https://www.pinterest.com/oembed.json?url=" + encodeURIComponent(url),
      { signal: ctrl.signal, headers: { "User-Agent": UA } },
    );
    if (!res.ok) return null;
    const d = await res.json();
    const image = d.thumbnail_url ?? null;
    if (!image && !d.title) return null;
    return {
      ok: true,
      url,
      title: d.title ?? null,
      image_url: image,
      author: d.author_name ?? null,
      provider: "pinterest",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function buildPreview(url: string): Promise<Preview> {
  const provider = providerFor(url);

  // Pinterest: try oEmbed first (cleanest image), then fall through to OG scrape.
  if (provider === "pinterest") {
    const oe = await pinterestOEmbed(url);
    if (oe && oe.image_url) return oe;
  }

  const fetched = await fetchText(url);
  if (!fetched) {
    return { ok: false, url, title: null, image_url: null, author: null, provider };
  }
  const { html, finalUrl } = fetched;
  const image = metaContent(html, [
    "og:image",
    "og:image:secure_url",
    "twitter:image",
    "twitter:image:src",
  ]);
  const title =
    metaContent(html, ["og:title", "twitter:title"]) ?? titleTag(html);
  const author = metaContent(html, [
    "og:site_name",
    "author",
    "article:author",
  ]);

  return {
    ok: !!(image || title),
    url: finalUrl,
    title,
    image_url: image,
    author,
    provider,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const empty = (url: string | null, provider = "link"): Preview => ({
    ok: false,
    url,
    title: null,
    image_url: null,
    author: null,
    provider,
  });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Any signed-in caller may fetch a preview (invoke sends the JWT/anon key).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(empty(null), 401);

    const { url } = await req.json().catch(() => ({}));
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return json(empty(typeof url === "string" ? url : null), 200);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Cache hit (keyed by the pasted URL so repeated pastes are instant).
    const { data: cached } = await admin
      .from("link_previews")
      .select("*")
      .eq("url", url)
      .maybeSingle();
    if (
      cached &&
      Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS
    ) {
      return json({
        ok: !!(cached.image_url || cached.title),
        url: cached.url,
        title: cached.title,
        image_url: cached.image_url,
        author: cached.author,
        provider: cached.provider ?? providerFor(url),
      });
    }

    const preview = await buildPreview(url);

    // Cache best-effort (don't fail the request if the write hiccups).
    await admin
      .from("link_previews")
      .upsert({
        url,
        title: preview.title,
        image_url: preview.image_url,
        author: preview.author,
        provider: preview.provider,
        fetched_at: new Date().toISOString(),
      })
      .then(undefined, () => {});

    return json(preview);
  } catch (err) {
    console.error("link-preview error", err);
    return json(empty(null), 200); // never break the UI
  }
});
