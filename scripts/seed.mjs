// Trippl — DEV/DEMO seed. Populates a Supabase project with a few demo travelers,
// two trips, and enough Release-2 data (completed trip → passport, journal,
// connections, a nearby opt-in) to see the app full rather than empty.
//
// SAFETY: this creates fake auth users + data. It refuses to run without an
// explicit opt-in, and should ONLY ever be pointed at a dev/demo project.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SEED_CONFIRM=1 \
//     node scripts/seed.mjs
//
// It's idempotent: users are matched by email, and all rows use fixed ids /
// unique keys, so re-running updates rather than duplicates.

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error(
    "✗ Missing env. Set SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and " +
      "SUPABASE_SERVICE_ROLE_KEY (the service-role key — never the anon key).",
  );
  process.exit(1);
}
if (process.env.SEED_CONFIRM !== "1") {
  console.error(
    "✗ Refusing to run without SEED_CONFIRM=1.\n" +
      "  This creates DEMO users + data and must only target a dev/demo project.",
  );
  process.exit(1);
}

const supa = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// --- demo constants -------------------------------------------------------
const PASSWORD = "Trippl-Demo-2026!";
const DOMAIN = "demo.trippl.invalid"; // reserved .invalid TLD — never deliverable

// Fixed UUIDs so re-running upserts instead of duplicating.
const T_TOKYO = "a5eed000-0000-4000-8000-000000000001";
const T_LISBON = "a5eed000-0000-4000-8000-000000000002";

const PEOPLE = [
  { key: "maya", name: "Maya Okafor", handle: "mayao", city: "Los Angeles", visibility: "public", moderator: true, bio: "Road-trip organiser. Will make a spreadsheet for your birthday." },
  { key: "devin", name: "Devin Park", handle: "dpark", city: "Seattle", visibility: "public", bio: "Window seat, always." },
  { key: "priya", name: "Priya Nair", handle: "priya", city: "Austin", visibility: "public", bio: "Chasing food markets around the world." },
  { key: "sam", name: "Sam Rivera", handle: "samr", city: "Miami", visibility: "private", bio: "" },
  { key: "leo", name: "Leo Fischer", handle: "leof", city: "Chicago", visibility: "private", bio: "" },
];

// ISO date helper (relative to run time — this is a Node script, not a workflow).
const iso = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

// Inline geohash (precision 5) — matches lib/geohash.ts.
function geohash(lat, lng, precision = 5) {
  const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let idx = 0, bit = 0, even = true, g = "";
  let a = -90, b = 90, c = -180, d = 180;
  while (g.length < precision) {
    if (even) { const m = (c + d) / 2; if (lng >= m) { idx = idx * 2 + 1; c = m; } else { idx = idx * 2; d = m; } }
    else { const m = (a + b) / 2; if (lat >= m) { idx = idx * 2 + 1; a = m; } else { idx = idx * 2; b = m; } }
    even = !even;
    if (++bit === 5) { g += B32[idx]; bit = 0; idx = 0; }
  }
  return g;
}

const step = async (label, fn) => {
  try {
    await fn();
    console.log(`✓ ${label}`);
  } catch (e) {
    console.warn(`! ${label} — ${e?.message ?? e}`);
  }
};

// Create the auth user or find the existing one; returns its id.
async function ensureUser(email, name) {
  const created = await supa.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (created.data?.user) return created.data.user.id;
  // Already exists → find by paging the user list.
  for (let page = 1; page <= 20; page++) {
    const { data } = await supa.auth.admin.listUsers({ page, perPage: 200 });
    const hit = data?.users?.find((u) => u.email === email);
    if (hit) return hit.id;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  throw new Error(`could not create or find ${email}`);
}

async function main() {
  console.log(`Seeding ${URL} …\n`);
  const id = {}; // key -> user id

  await step("demo users + profiles", async () => {
    for (const p of PEOPLE) {
      id[p.key] = await ensureUser(`${p.key}@${DOMAIN}`, p.name);
      const { error } = await supa.from("profiles").upsert(
        {
          id: id[p.key],
          display_name: p.name,
          full_name: p.name,
          handle: p.handle,
          bio: p.bio || null,
          home_city: p.city,
          visibility: p.visibility,
          age_band: "adult",
          age_set_at: new Date().toISOString(),
          is_moderator: !!p.moderator,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
    }
  });

  await step("trips (Tokyo — completed, Lisbon — upcoming)", async () => {
    const rows = [
      { id: T_TOKYO, host_id: id.maya, title: "Tokyo Days", location_city: "Tokyo", location_lat: 35.6812, location_lng: 139.7671, start_date: iso(-45), end_date: iso(-38), status: "completed" },
      { id: T_LISBON, host_id: id.maya, title: "Lisbon Summer", location_city: "Lisbon", location_lat: 38.7223, location_lng: -9.1393, start_date: iso(30), end_date: iso(37), status: "planning" },
    ];
    const { error } = await supa.from("trips").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  });

  await step("memberships (everyone on both trips)", async () => {
    const members = [];
    for (const t of [T_TOKYO, T_LISBON]) {
      for (const p of PEOPLE) members.push({ trip_id: t, user_id: id[p.key], role: p.key === "maya" ? "host" : "member" });
    }
    const { error } = await supa.from("trip_members").upsert(members, { onConflict: "trip_id,user_id" });
    if (error) throw error;
  });

  await step("activities on the Tokyo trip (→ passport landmarks/places)", async () => {
    const acts = [
      { id: "ac000000-0000-4000-8000-000000000001", trip_id: T_TOKYO, created_by: id.maya, title: "Tokyo Tower at night", location: "Tokyo" },
      { id: "ac000000-0000-4000-8000-000000000002", trip_id: T_TOKYO, created_by: id.devin, title: "Mount Fuji day trip", location: "Fuji" },
      { id: "ac000000-0000-4000-8000-000000000003", trip_id: T_TOKYO, created_by: id.priya, title: "Shibuya food crawl", location: "Shibuya" },
    ];
    const { error } = await supa.from("activities").upsert(acts, { onConflict: "id" });
    if (error) throw error;
  });

  await step("verified flight proofs (→ passport airports) + distances (→ miles)", async () => {
    const proofs = [
      { id: "b0000000-0000-4000-8000-000000000001", trip_id: T_TOKYO, user_id: id.maya, type: "flight", verified: true, verified_at: new Date().toISOString(), arrival_airport: "NRT", arrival_city: "Tokyo", passenger_name: "Maya Okafor", travel_dates: `${iso(-45)} – ${iso(-38)}` },
      { id: "b0000000-0000-4000-8000-000000000002", trip_id: T_TOKYO, user_id: id.devin, type: "flight", verified: true, verified_at: new Date().toISOString(), arrival_airport: "HND", arrival_city: "Tokyo", passenger_name: "Devin Park", travel_dates: `${iso(-45)} – ${iso(-38)}` },
    ];
    const p = await supa.from("travel_proofs").upsert(proofs, { onConflict: "id" });
    if (p.error) throw p.error;
    const dists = [
      { trip_id: T_TOKYO, user_id: id.maya, opted_in: true, meters: 17_600_000 }, // ~10,935 mi round trip LA–Tokyo
      { trip_id: T_TOKYO, user_id: id.devin, opted_in: true, meters: 15_300_000 },
    ];
    const d = await supa.from("trip_distances").upsert(dists, { onConflict: "trip_id,user_id" });
    if (d.error) throw d.error;
  });

  await step("journal entries on the Tokyo trip", async () => {
    const entries = [
      { id: "10000000-0000-4000-8000-000000000001", trip_id: T_TOKYO, author_id: id.maya, body: "Landed at Narita, everyone made it. Ramen within the hour.", day: iso(-45) },
      { id: "10000000-0000-4000-8000-000000000002", trip_id: T_TOKYO, author_id: id.priya, body: "Shibuya crossing is even bigger in person. 10/10 people-watching.", day: iso(-43) },
    ];
    const { error } = await supa.from("journal_entries").upsert(entries, { onConflict: "id" });
    if (error) throw error;
  });

  await step("connections (Maya↔Devin accepted, Sam→Maya pending)", async () => {
    const pairs = [
      { requester_id: id.maya, addressee_id: id.devin, status: "accepted" },
      { requester_id: id.sam, addressee_id: id.maya, status: "pending" },
    ];
    for (const c of pairs) {
      // delete any existing edge between the pair (idempotent — no upsert target
      // on the functional unique index), then insert.
      await supa
        .from("connections")
        .delete()
        .or(
          `and(requester_id.eq.${c.requester_id},addressee_id.eq.${c.addressee_id}),` +
            `and(requester_id.eq.${c.addressee_id},addressee_id.eq.${c.requester_id})`,
        );
      const { error } = await supa.from("connections").insert(c);
      if (error) throw error;
    }
  });

  await step("nearby opt-ins for Lisbon (Maya + Priya match)", async () => {
    const area = geohash(38.7223, -9.1393); // Lisbon
    const rows = [id.maya, id.priya].map((uid) => ({
      user_id: uid,
      trip_id: T_LISBON,
      area_geohash: area,
      window_start: iso(30),
      window_end: iso(37),
      expires_at: iso(67),
    }));
    const { error } = await supa.from("discovery_optins").upsert(rows, { onConflict: "user_id,trip_id" });
    if (error) throw error;
  });

  console.log(`\n✓ Done. Sign in as any demo user:`);
  for (const p of PEOPLE) console.log(`    ${p.key}@${DOMAIN}   ${PASSWORD}`);
  console.log(
    `\n  • Maya's passport is populated (Tokyo trip, verified flight, miles, a landmark).\n` +
      `  • Maya ↔ Devin are connected; Sam has a pending request to Maya.\n` +
      `  • Maya + Priya opted into Nearby for Lisbon and see each other.\n` +
      `  • Maya is a moderator (Settings → Moderation).`,
  );
}

main().catch((e) => {
  console.error("✗ Seed failed:", e?.message ?? e);
  process.exit(1);
});
