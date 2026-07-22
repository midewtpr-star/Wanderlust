// Calor — Phase 8: nearby-ideas edge function (Deno).
//
// Given a trip, returns a NORMALIZED list of local ideas (things to do / events)
// near the destination:
//   { name, category, description, address, lat, lng, rating, url, image, source }
//
// Backed by Google Places (GOOGLE_PLACES_API_KEY lives ONLY in this function's
// secrets, never the client). Extra sources (Ticketmaster/Eventbrite) can be
// added later behind the same normalized shape — see the SOURCES array. If the
// key is missing the function returns { configured: false } so the UI degrades
// gracefully.
//
// Deploy:  supabase functions deploy nearby-ideas
// Secrets: supabase secrets set GOOGLE_PLACES_API_KEY=...
//
// Coordinates: pass { trip_id, lat, lng }. If lat/lng are absent, the function
// geocodes the trip's destination on demand (Nominatim) and stores it on the trip
// (keeps geocoding behind the server boundary, foundation §9).

import { createClient } from "jsr:@supabase/supabase-js@2";

const RADIUS_METERS = 8000; // ~5 miles
const PER_CATEGORY = 6; // cap results per category

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Idea = {
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  url: string | null;
  image: string | null;
  source: string;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// TODO: to use Google Geocoding instead of Nominatim, add GOOGLE_MAPS_API_KEY to
// this function's secrets and call the Geocoding API here.
async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
      encodeURIComponent(query);
    const res = await fetch(url, {
      headers: { "User-Agent": "Calor/1.0 (local-ideas)" },
    });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const lat = parseFloat(arr[0].lat);
    const lng = parseFloat(arr[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

// Resolve a Google Places photo to a KEYLESS image URL by following the redirect
// server-side (the photo endpoint 302s to a googleusercontent.com URL with no
// key), so we never hand the API key to the client.
async function resolvePhoto(
  photoRef: string,
  key: string,
): Promise<string | null> {
  try {
    const url =
      "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=" +
      encodeURIComponent(photoRef) +
      "&key=" +
      key;
    const res = await fetch(url, { redirect: "manual" });
    const loc = res.headers.get("location");
    return loc && !loc.includes("key=") ? loc : null;
  } catch {
    return null;
  }
}

const CATEGORY_TYPES: { category: string; type: string }[] = [
  { category: "food", type: "restaurant" },
  { category: "outdoors", type: "park" },
  { category: "nightlife", type: "night_club" },
  { category: "attractions", type: "tourist_attraction" },
  // "events" has no Places type — reserved for a future Ticketmaster/Eventbrite
  // source that emits the same normalized Idea shape.
];

async function fetchGooglePlaces(
  lat: number,
  lng: number,
  key: string,
): Promise<{ ideas: Idea[]; note: string | null }> {
  let note: string | null = null;
  const seen = new Set<string>();
  const collected: { idea: Idea; photoRef: string | null }[] = [];

  const results = await Promise.all(
    CATEGORY_TYPES.map(async ({ category, type }) => {
      const url =
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=" +
        `${lat},${lng}&radius=${RADIUS_METERS}&type=${type}&key=${key}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
          note = `Google Places: ${data.status}`;
        }
        return { category, places: (data.results ?? []).slice(0, PER_CATEGORY) };
      } catch {
        return { category, places: [] as unknown[] };
      }
    }),
  );

  for (const { category, places } of results) {
    for (const p of places as Record<string, unknown>[]) {
      const placeId = String(p.place_id ?? "");
      if (!placeId || seen.has(placeId)) continue;
      seen.add(placeId);
      const geo = (p.geometry as { location?: { lat: number; lng: number } })
        ?.location;
      const photos = p.photos as { photo_reference?: string }[] | undefined;
      const types = (p.types as string[] | undefined) ?? [];
      collected.push({
        idea: {
          name: String(p.name ?? "Place"),
          category,
          description: types[0]
            ? String(types[0]).replace(/_/g, " ")
            : null,
          address: (p.vicinity as string) ?? null,
          lat: geo?.lat ?? null,
          lng: geo?.lng ?? null,
          rating: (p.rating as number) ?? null,
          // Keyless Google Maps place link (open / directions).
          url:
            "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(String(p.name ?? "")) +
            "&query_place_id=" +
            placeId,
          image: null,
          source: "google_places",
        },
        photoRef: photos?.[0]?.photo_reference ?? null,
      });
    }
  }

  // Resolve photos to keyless URLs in parallel.
  await Promise.all(
    collected.map(async (c) => {
      if (c.photoRef) c.idea.image = await resolvePhoto(c.photoRef, key);
    }),
  );

  return { ideas: collected.map((c) => c.idea), note };
}

// Additional sources plug in here, each returning Idea[] in the same shape.
const SOURCES = [fetchGooglePlaces];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const placesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ configured: false, ideas: [], error: "Not signed in." }, 401);

    const body = await req.json().catch(() => ({}));
    const { trip_id } = body;
    let lat: number | null = typeof body.lat === "number" ? body.lat : null;
    let lng: number | null = typeof body.lng === "number" ? body.lng : null;
    if (!trip_id) return json({ configured: !!placesKey, ideas: [], error: "Missing trip." }, 400);

    // Identity + membership (service role does the rest).
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ configured: !!placesKey, ideas: [], error: "Not signed in." }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: membership } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return json({ configured: !!placesKey, ideas: [], error: "Not a member of this trip." }, 403);
    }

    // Resolve coordinates (geocode the destination on demand if missing).
    if (lat == null || lng == null) {
      const { data: trip } = await admin
        .from("trips")
        .select("location_city, location_lat, location_lng")
        .eq("id", trip_id)
        .maybeSingle();
      if (trip?.location_lat != null && trip?.location_lng != null) {
        lat = Number(trip.location_lat);
        lng = Number(trip.location_lng);
      } else if (trip?.location_city) {
        const g = await geocode(trip.location_city);
        if (g) {
          lat = g.lat;
          lng = g.lng;
          await admin
            .from("trips")
            .update({ location_lat: lat, location_lng: lng })
            .eq("id", trip_id);
        }
      }
    }

    if (lat == null || lng == null) {
      return json({ configured: !!placesKey, ideas: [], noDestination: true });
    }

    // Not configured → clear, graceful response.
    if (!placesKey) {
      return json({ configured: false, ideas: [], coords: { lat, lng } });
    }

    // Aggregate all sources (Google today; more later) into one normalized list.
    const all: Idea[] = [];
    let note: string | null = null;
    for (const source of SOURCES) {
      const r = await source(lat, lng, placesKey);
      all.push(...r.ideas);
      if (r.note) note = r.note;
    }

    return json({ configured: true, ideas: all, coords: { lat, lng }, note });
  } catch (err) {
    console.error("nearby-ideas error", err);
    return json({ configured: true, ideas: [], error: "Couldn't load ideas right now." }, 200);
  }
});
