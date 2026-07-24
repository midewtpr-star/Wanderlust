// Trippl — delete-account edge function (Deno).
//
// Apple requires in-app account deletion. This performs it irreversibly, while
// protecting other members' data:
//   1. Authenticate the caller (their JWT) — only the account owner can delete it.
//   2. Hand off any trips they HOST to another admin/member (reassign_hosted_trips)
//      so the group keeps its trip; solo trips cascade-delete with the user.
//   3. Best-effort purge their private storage objects (itineraries + trip media).
//   4. auth.admin.deleteUser → cascades their profile, memberships, connections,
//      journal, passport, nearby opt-ins, reports, etc. Shared-pool contributions
//      are anonymised (FK ON DELETE SET NULL), NOT deleted, so pool totals stay.
//
// Deploy:  supabase functions deploy delete-account
// Secrets: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
//          injected automatically for Edge Functions — no extra secret needed.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Best-effort removal of the user's objects from the two private buckets.
async function purgeStorage(admin: SupabaseClient, uid: string) {
  // flight-itineraries: <uid>/*
  try {
    const { data } = await admin.storage.from("flight-itineraries").list(uid, { limit: 1000 });
    if (data?.length) {
      await admin.storage.from("flight-itineraries").remove(data.map((o) => `${uid}/${o.name}`));
    }
  } catch { /* best-effort */ }
  // trip-media: <tripId>/<uid>/* across the user's trips
  try {
    const { data: mem } = await admin.from("trip_members").select("trip_id").eq("user_id", uid);
    for (const m of mem ?? []) {
      const prefix = `${m.trip_id}/${uid}`;
      const { data } = await admin.storage.from("trip-media").list(prefix, { limit: 1000 });
      if (data?.length) {
        await admin.storage.from("trip-media").remove(data.map((o) => `${prefix}/${o.name}`));
      }
    }
  } catch { /* best-effort */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "unauthenticated" }, 401);

    // Identify the caller from their JWT — only the owner may delete the account.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: "unauthenticated" }, 401);

    // Require an explicit confirmation token so this can't fire by accident.
    const { confirm } = await req.json().catch(() => ({}));
    if (confirm !== "DELETE") return json({ ok: false, error: "confirmation required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const uid = user.id;

    // 1) Protect the group's trips + money before removing the user.
    await admin.rpc("reassign_hosted_trips", { _user: uid });

    // 2) Purge their private files (cascades don't cover storage objects).
    await purgeStorage(admin, uid);

    // 3) Delete the auth user → cascades the rest; contributions anonymise.
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) return json({ ok: false, error: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
