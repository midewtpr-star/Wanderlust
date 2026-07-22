// AppName — Phase 4: verify-flight edge function (Deno).
//
// Receives { trip_id, path } where `path` points at a file the member already
// uploaded to the PRIVATE `flight-itineraries` bucket. It:
//   1. authenticates the caller and checks they're a member of the trip,
//   2. downloads the itinerary with the SERVICE ROLE (bypasses storage RLS),
//   3. sends it to a vision LLM (Anthropic Messages API) to extract structured
//      fields — the ANTHROPIC_API_KEY lives ONLY in this function's secrets,
//   4. resolves the arrival airport → city + coordinates,
//   5. geocodes the trip destination on demand if it has no coordinates yet,
//   6. checks haversine proximity (PASS within NEARBY_MILES), fuzzy name match
//      (soft — flags, never hard-fails), and travel dates (warn only),
//   7. upserts a travel_proofs row (verified on pass) and, on pass, marks the
//      member_steps `travel_proof` step complete.
//
// Deploy:  supabase functions deploy verify-flight
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected by
// the platform. We call the Anthropic REST API directly (raw fetch) so the exact
// request shape is explicit and version-stable; forced tool_use gives us
// guaranteed structured JSON without depending on a specific SDK build.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding/base64";

// Tunable: how close the itinerary's arrival must be to the trip destination.
const NEARBY_MILES = 100;

const ANTHROPIC_MODEL = "claude-opus-4-8"; // vision-capable
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Extracted = {
  is_flight_itinerary: boolean;
  passenger_name: string | null;
  confirmation_number: string | null;
  arrival_airport_iata: string | null;
  arrival_city: string | null;
  travel_dates: string | null;
};

type Verdict = {
  ok: boolean;
  status: "verified" | "failed" | "error";
  reason: string | null;
  extracted: Omit<Extracted, "is_flight_itinerary"> | null;
  distance_miles: number | null;
  resolved_city: string | null;
  name_match: boolean;
  date_in_window: boolean | null;
  warnings: string[];
};

function json(body: Verdict, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- geometry ---------------------------------------------------------------
function haversineMiles(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 3958.8; // Earth radius, miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// --- geocoding (free OpenStreetMap / Nominatim) -----------------------------
// TODO: to use Google Geocoding instead, add GOOGLE_MAPS_API_KEY to this
// function's secrets and call
//   https://maps.googleapis.com/maps/api/geocode/json?address=<q>&key=<key>
// here, returning results[0].geometry.location {lat,lng}.
async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
      encodeURIComponent(query);
    const res = await fetch(url, {
      headers: { "User-Agent": "AppName/1.0 (travel-proof verifier)" },
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

// --- fuzzy name match (soft) ------------------------------------------------
// Real tickets print names as "LAST/FIRST", "FIRST LAST", "MR FIRST LAST", etc.
// We only flag a mismatch when both names are present and share NO token — a
// deliberately lenient check, since a mismatch flags for review, never blocks.
function nameMatches(extracted: string | null, profile: string | null): boolean {
  if (!extracted || !profile) return true; // can't compare → don't penalize
  const toks = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") // strip accents
        .replace(/[^a-z\s/]/g, " ")
        .split(/[\s/]+/)
        .filter((t) => t.length >= 2),
    );
  const a = toks(extracted);
  const b = toks(profile);
  if (a.size === 0 || b.size === 0) return true;
  for (const t of a) if (b.has(t)) return true;
  return false;
}

// --- best-effort date window check ------------------------------------------
// travel_dates is free text off the itinerary. We try to parse any dates out of
// it and check whether at least one lands inside the trip window (±3 days grace).
// Unparseable → null (no warning). Never blocks.
function dateInWindow(
  travelDates: string | null,
  start: string | null,
  end: string | null,
): boolean | null {
  if (!travelDates || !start || !end) return null;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  const grace = 3 * 24 * 60 * 60 * 1000;
  const chunks = travelDates.split(/[,–—\-to]+/i).map((c) => c.trim());
  const parsed: number[] = [];
  for (const c of [travelDates, ...chunks]) {
    const ms = Date.parse(c);
    if (!Number.isNaN(ms)) parsed.push(ms);
  }
  if (parsed.length === 0) return null;
  return parsed.some((ms) => ms >= startMs - grace && ms <= endMs + grace);
}

// --- LLM extraction ---------------------------------------------------------
async function extractItinerary(
  apiKey: string,
  base64Data: string,
  mediaType: string,
  isPdf: boolean,
): Promise<Extracted | null> {
  const fileBlock = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64Data },
      }
    : {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64Data },
      };

  const tool = {
    name: "record_itinerary",
    description:
      "Record the structured details extracted from a flight itinerary, " +
      "boarding pass, or e-ticket.",
    input_schema: {
      type: "object",
      properties: {
        is_flight_itinerary: {
          type: "boolean",
          description:
            "true only if this document is genuinely a flight itinerary, " +
            "boarding pass, or airline e-ticket. false for anything else.",
        },
        passenger_name: {
          type: ["string", "null"],
          description: "The passenger name exactly as printed.",
        },
        confirmation_number: {
          type: ["string", "null"],
          description: "Booking reference / confirmation / PNR code.",
        },
        arrival_airport_iata: {
          type: ["string", "null"],
          description:
            "3-letter IATA code of the FINAL destination airport (the last " +
            "arrival across all legs). e.g. JFK, LAX, LHR.",
        },
        arrival_city: {
          type: ["string", "null"],
          description: "City of the final destination airport.",
        },
        travel_dates: {
          type: ["string", "null"],
          description: "Travel date(s) as printed on the itinerary.",
        },
      },
      required: [
        "is_flight_itinerary",
        "passenger_name",
        "confirmation_number",
        "arrival_airport_iata",
        "arrival_city",
        "travel_dates",
      ],
    },
  };

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      tools: [tool],
      tool_choice: { type: "tool", name: "record_itinerary" },
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text:
                "Extract the flight itinerary details using the record_itinerary " +
                "tool. Use the FINAL destination (last leg) for arrival fields. " +
                "If the document is not a flight itinerary, set is_flight_itinerary " +
                "to false and leave the other fields null.",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Anthropic API error", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const toolUse = (data.content ?? []).find(
    (b: { type: string }) => b.type === "tool_use",
  );
  if (!toolUse) return null;
  return toolUse.input as Extracted;
}

// --- handler ----------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const fail = (reason: string): Verdict => ({
    ok: false,
    status: "error",
    reason,
    extracted: null,
    distance_miles: null,
    resolved_city: null,
    name_match: true,
    date_in_window: null,
    warnings: [],
  });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return json(fail("Flight verification isn't configured yet."), 200);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(fail("Not signed in."), 401);

    const { trip_id, path } = await req.json().catch(() => ({}));
    if (!trip_id || !path) {
      return json(fail("Missing trip or file."), 400);
    }

    // Caller identity (user-scoped client just to read the JWT's user).
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json(fail("Not signed in."), 401);

    // Everything else uses the service role.
    const admin = createClient(supabaseUrl, serviceKey);

    // Membership check.
    const { data: membership } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return json(fail("You're not a member of this trip."), 403);

    // The path must live under this member's own folder in this trip.
    const folders = String(path).split("/");
    if (folders[0] !== trip_id || folders[1] !== user.id) {
      return json(fail("That file doesn't belong to you."), 403);
    }

    // Download the itinerary (service role bypasses storage RLS).
    const { data: blob, error: dlErr } = await admin.storage
      .from("flight-itineraries")
      .download(path);
    if (dlErr || !blob) return json(fail("We couldn't open that file."), 200);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const base64Data = encodeBase64(bytes);

    const ext = String(path).split(".").pop()?.toLowerCase() ?? "";
    const isPdf = ext === "pdf";
    const mediaType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "image/jpeg";

    // Trip context.
    const { data: trip } = await admin
      .from("trips")
      .select("location_city, location_lat, location_lng, start_date, end_date")
      .eq("id", trip_id)
      .maybeSingle();
    if (!trip) return json(fail("Trip not found."), 200);

    // Extract structured fields from the itinerary.
    const extracted = await extractItinerary(
      anthropicKey,
      base64Data,
      mediaType,
      isPdf,
    );
    if (!extracted) {
      return json(fail("The verification service had a hiccup — try again."), 200);
    }

    const extractedPublic = {
      passenger_name: extracted.passenger_name ?? null,
      confirmation_number: extracted.confirmation_number ?? null,
      arrival_airport_iata: extracted.arrival_airport_iata ?? null,
      arrival_city: extracted.arrival_city ?? null,
      travel_dates: extracted.travel_dates ?? null,
    };

    // Helper to persist a proof row (upsert one-per-member-per-trip).
    async function saveProof(verified: boolean) {
      await admin.from("travel_proofs").upsert(
        {
          trip_id,
          user_id: user!.id,
          type: "flight",
          passenger_name: extractedPublic.passenger_name,
          confirmation_number: extractedPublic.confirmation_number,
          arrival_airport: extractedPublic.arrival_airport_iata,
          arrival_city: extractedPublic.arrival_city,
          travel_dates: extractedPublic.travel_dates,
          file_url: path,
          verified,
          verified_at: verified ? new Date().toISOString() : null,
          verified_by: null,
        },
        { onConflict: "trip_id,user_id" },
      );
      if (verified) {
        await admin.from("member_steps").upsert(
          {
            trip_id,
            user_id: user!.id,
            step: "travel_proof",
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "trip_id,user_id,step" },
        );
      }
    }

    const contentFail = async (reason: string): Promise<Response> => {
      await saveProof(false); // keep the row so an admin can review + override
      return json({
        ok: false,
        status: "failed",
        reason,
        extracted: extractedPublic,
        distance_miles: null,
        resolved_city: null,
        name_match: true,
        date_in_window: null,
        warnings: [],
      });
    };

    if (!extracted.is_flight_itinerary) {
      return await contentFail(
        "That doesn't look like a flight itinerary. Upload your e-ticket, " +
          "boarding pass, or booking confirmation.",
      );
    }

    // Resolve arrival coordinates: airports table by IATA, else geocode the city.
    let arrLat: number | null = null;
    let arrLng: number | null = null;
    let resolvedCity: string | null = extractedPublic.arrival_city;
    const iata = extractedPublic.arrival_airport_iata?.toUpperCase().trim();
    if (iata) {
      const { data: ap } = await admin
        .from("airports")
        .select("city, lat, lng")
        .eq("iata", iata)
        .maybeSingle();
      if (ap) {
        arrLat = Number(ap.lat);
        arrLng = Number(ap.lng);
        resolvedCity = ap.city ?? resolvedCity;
      }
    }
    if (arrLat == null && resolvedCity) {
      const g = await geocode(resolvedCity);
      if (g) {
        arrLat = g.lat;
        arrLng = g.lng;
      }
    }
    if (arrLat == null || arrLng == null) {
      return await contentFail(
        "We couldn't recognize the arrival airport on that itinerary.",
      );
    }

    // Ensure the trip has coordinates (geocode on demand if missing).
    let tripLat = trip.location_lat != null ? Number(trip.location_lat) : null;
    let tripLng = trip.location_lng != null ? Number(trip.location_lng) : null;
    if (tripLat == null || tripLng == null) {
      if (!trip.location_city) {
        return json(fail("This trip has no destination set to verify against."), 200);
      }
      const g = await geocode(trip.location_city);
      if (!g) {
        return json(
          fail("We couldn't locate this trip's destination to verify against."),
          200,
        );
      }
      tripLat = g.lat;
      tripLng = g.lng;
      await admin
        .from("trips")
        .update({ location_lat: tripLat, location_lng: tripLng })
        .eq("id", trip_id);
    }

    // Proximity — the hard gate.
    const distance = haversineMiles(tripLat, tripLng, arrLat, arrLng);
    const distanceRounded = Math.round(distance);

    // Soft checks (warnings only, never block).
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, display_name")
      .eq("id", user.id)
      .maybeSingle();
    const profileName = profile?.full_name || profile?.display_name || null;
    const nameOk = nameMatches(extractedPublic.passenger_name, profileName);
    const dateOk = dateInWindow(
      extractedPublic.travel_dates,
      trip.start_date,
      trip.end_date,
    );

    const warnings: string[] = [];
    if (!nameOk) {
      warnings.push(
        "The passenger name doesn't match your profile — flagged for admin review.",
      );
    }
    if (dateOk === false) {
      warnings.push("The travel dates look outside the trip window.");
    }

    if (distance > NEARBY_MILES) {
      await saveProof(false); // keep the row so an admin can review + override
      return json({
        ok: false,
        status: "failed",
        reason:
          `That itinerary arrives in ${resolvedCity ?? "another city"} — about ` +
          `${distanceRounded} miles from ${trip.location_city ?? "the trip"}.`,
        extracted: extractedPublic,
        distance_miles: distanceRounded,
        resolved_city: resolvedCity,
        name_match: nameOk,
        date_in_window: dateOk,
        warnings,
      });
    }

    // PASS.
    await saveProof(true);
    return json({
      ok: true,
      status: "verified",
      reason: null,
      extracted: extractedPublic,
      distance_miles: distanceRounded,
      resolved_city: resolvedCity,
      name_match: nameOk,
      date_in_window: dateOk,
      warnings,
    });
  } catch (err) {
    console.error("verify-flight error", err);
    return json(fail("Something went wrong verifying your itinerary."), 200);
  }
});
