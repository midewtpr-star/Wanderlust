// Trippl — notify-message edge function (Deno).
//
// Fans a new chat message out to the OTHER trip members' devices via the Expo
// Push API, using the push tokens stored in `push_tokens`. Minimal + best-effort:
//   1. authenticate the caller and confirm they are the message's sender,
//   2. confirm the sender is a member of the trip (defense in depth),
//   3. load the recipients' Expo push tokens with the SERVICE ROLE (every other
//      member of the trip),
//   4. POST them to Expo's push endpoint.
// If there are no tokens yet (push not configured), it simply no-ops. The client
// invokes this fire-and-forget, so the chat NEVER blocks on push.
//
// Deploy:  supabase functions deploy notify-message
// Notes:   Expo's push endpoint needs no secret to *send*. Real *delivery* to
//          devices still requires EAS credentials configured on the app side
//          (APNs key for iOS, FCM v1 for Android) + extra.eas.projectId — see
//          lib/push.ts. Presence-aware suppression (don't notify a member who is
//          actively viewing this chat) is a deliberate follow-up, noted below.

import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, sent: 0 }, 401);

    const { trip_id, message_id } = await req.json().catch(() => ({}));
    if (!trip_id || !message_id) return json({ ok: false, sent: 0 }, 400);

    // Caller identity (user-scoped client just to read the JWT's user).
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, sent: 0 }, 401);

    // Everything else uses the service role.
    const admin = createClient(supabaseUrl, serviceKey);

    // Load the message; confirm it belongs to this trip and this sender.
    const { data: msg } = await admin
      .from("messages")
      .select("id, trip_id, sender_id, body")
      .eq("id", message_id)
      .maybeSingle();
    if (!msg || msg.trip_id !== trip_id || msg.sender_id !== user.id) {
      return json({ ok: false, sent: 0 }, 200);
    }

    // Membership (defense in depth — RLS already gates the insert).
    const { data: membership } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return json({ ok: false, sent: 0 }, 200);

    // Sender name + trip title for the notification copy.
    const [{ data: sender }, { data: trip }] = await Promise.all([
      admin.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      admin.from("trips").select("title").eq("id", trip_id).maybeSingle(),
    ]);
    const senderName = sender?.display_name || "Someone";
    const tripTitle = trip?.title || "your trip";

    // Recipients = every OTHER member's push tokens.
    // (Follow-up: skip members currently viewing this chat once presence exists.)
    const { data: members } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", trip_id)
      .neq("user_id", user.id);
    const memberIds = (members ?? []).map((m) => m.user_id);
    if (memberIds.length === 0) return json({ ok: true, sent: 0 }, 200);

    const { data: tokenRows } = await admin
      .from("push_tokens")
      .select("token")
      .in("user_id", memberIds);
    const tokens = (tokenRows ?? [])
      .map((t) => t.token as string)
      .filter(Boolean);
    if (tokens.length === 0) return json({ ok: true, sent: 0 }, 200);

    const preview =
      msg.body.length > 140 ? `${msg.body.slice(0, 137)}…` : msg.body;
    const pushes = tokens.map((token) => ({
      to: token,
      title: `${senderName} · ${tripTitle}`,
      body: preview,
      data: { tripId: trip_id, kind: "chat" },
      sound: "default",
    }));

    // Expo accepts up to 100 messages per request.
    let sent = 0;
    for (let i = 0; i < pushes.length; i += 100) {
      const chunk = pushes.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length;
      else console.error("[notify-message] Expo push error", res.status, await res.text());
    }

    return json({ ok: true, sent }, 200);
  } catch (err) {
    console.error("notify-message error", err);
    // Best-effort: never surface an error the client would act on.
    return json({ ok: false, sent: 0 }, 200);
  }
});
