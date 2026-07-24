// AppName — Phase 4: seed the `airports` table from the free OurAirports dataset.
//
// Usage:
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
//   node scripts/seed-airports.mjs
//
// (EXPO_PUBLIC_SUPABASE_URL is accepted as a fallback for the URL.)
//
// Loads large + medium airports that have an IATA code (~4k rows) and upserts
// them by IATA. The SERVICE ROLE key is required (writes bypass RLS) — it is
// read from the environment and never committed. Safe to re-run (idempotent).

import { createClient } from "@supabase/supabase-js";

const CSV_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env. Set SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and " +
      "SUPABASE_SERVICE_ROLE_KEY, then re-run.",
  );
  process.exit(1);
}

// Minimal RFC-4180-ish CSV line splitter (handles quotes + escaped "" + commas).
function parseLine(line) {
  const out = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}

async function main() {
  console.log("Downloading OurAirports dataset…");
  const res = await fetch(CSV_URL);
  if (!res.ok) {
    console.error(`Download failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const text = await res.text();

  // Split on newlines but keep it simple: the OurAirports file uses \n and
  // quotes any embedded newlines rarely; parse line-by-line.
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseLine(lines[0]);
  const col = (name) => header.indexOf(name);
  const iType = col("type");
  const iName = col("name");
  const iLat = col("latitude_deg");
  const iLng = col("longitude_deg");
  const iCountry = col("iso_country");
  const iCity = col("municipality");
  const iIata = col("iata_code");

  const wanted = new Set(["large_airport", "medium_airport"]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const f = parseLine(lines[i]);
    const iata = (f[iIata] || "").trim().toUpperCase();
    if (!wanted.has(f[iType]) || iata.length !== 3) continue;
    const lat = parseFloat(f[iLat]);
    const lng = parseFloat(f[iLng]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    rows.push({
      iata,
      name: f[iName] || null,
      city: f[iCity] || null,
      country: f[iCountry] || null,
      lat,
      lng,
    });
  }

  // De-dupe by IATA (a handful of codes repeat; keep the first / larger one).
  const byIata = new Map();
  for (const r of rows) if (!byIata.has(r.iata)) byIata.set(r.iata, r);
  const unique = [...byIata.values()];
  console.log(`Parsed ${unique.length} airports with IATA codes. Upserting…`);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const BATCH = 500;
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const { error } = await supabase
      .from("airports")
      .upsert(batch, { onConflict: "iata" });
    if (error) {
      console.error("Upsert failed:", error.message);
      process.exit(1);
    }
    console.log(`  …${Math.min(i + BATCH, unique.length)}/${unique.length}`);
  }

  console.log("Done. airports table seeded.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
