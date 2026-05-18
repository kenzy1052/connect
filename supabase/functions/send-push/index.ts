/**
 * send-push/index.ts  — Supabase Edge Function
 *
 * Receives a push notification job and delivers it to every
 * push subscription registered for the target user.
 *
 * Expected JSON body:
 *   {
 *     user_id : string   — recipient's Supabase auth UUID
 *     title   : string
 *     body    : string
 *     url     : string   — path to open on click (e.g. "/listing/123")
 *     tag     : string   — deduplication tag (e.g. "save-abc123")
 *     icon?   : string   — optional icon URL override
 *   }
 *
 * Required Supabase Edge Function secrets (set in Dashboard → Settings → Secrets):
 *   VAPID_PUBLIC_KEY         — URL-safe base64 VAPID public key
 *   VAPID_PRIVATE_KEY        — URL-safe base64 VAPID private key
 *   VAPID_SUBJECT            — "mailto:admin@campusconnect.app" (or your URL)
 *   SUPABASE_URL             — auto-injected by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase
 *
 * Generate VAPID keys:
 *   npx web-push generate-vapid-keys
 */

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import webPush from "npm:web-push@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Parse + validate incoming payload ──────────────────────────────
    const { user_id, title, body, url = "/", tag, icon } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Initialise clients ─────────────────────────────────────────────
    const supabaseUrl      = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey   = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey  = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject     = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@campusconnect.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[send-push] VAPID keys not configured in Edge Function secrets.");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: VAPID keys missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure web-push VAPID details
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── 3. Fetch all push subscriptions for this user ─────────────────────
    const { data: subscriptions, error: fetchErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (fetchErr) {
      console.error("[send-push] Failed to fetch subscriptions:", fetchErr.message);
      return new Response(
        JSON.stringify({ error: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      // No subscriptions for this user — not an error, just a no-op
      console.log(`[send-push] No subscriptions found for user ${user_id}`);
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions for this user." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Build the notification payload ────────────────────────────────
    const payload = JSON.stringify({
      title,
      body,
      url,
      tag: tag ?? "cc-notification",
      icon: icon ?? "/icon-192.png",
      badge: "/icon-192.png",
    });

    // ── 5. Send to every subscription, collect results ────────────────────
    const staleEndpoints: string[] = [];
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        try {
          await webPush.sendNotification(pushSubscription, payload);
          console.log(`[send-push] ✅ Delivered to ${sub.endpoint.slice(0, 50)}…`);
        } catch (err: any) {
          // 404 / 410 = subscription expired or unregistered — clean it up
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.warn(`[send-push] Stale subscription (${err.statusCode}): ${sub.endpoint.slice(0, 50)}…`);
            staleEndpoints.push(sub.endpoint);
          } else {
            console.error(`[send-push] Delivery failed (${err.statusCode}): ${err.message}`);
          }
          throw err;
        }
      })
    );

    // ── 6. Prune stale subscriptions ──────────────────────────────────────
    if (staleEndpoints.length > 0) {
      const { error: deleteErr } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
      if (deleteErr) {
        console.warn("[send-push] Failed to prune stale subscriptions:", deleteErr.message);
      } else {
        console.log(`[send-push] Pruned ${staleEndpoints.length} stale subscription(s).`);
      }
    }

    const sent    = results.filter((r) => r.status === "fulfilled").length;
    const failed  = results.filter((r) => r.status === "rejected").length;

    console.log(`[send-push] Done. sent=${sent} failed=${failed} stale_pruned=${staleEndpoints.length}`);

    return new Response(
      JSON.stringify({ sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[send-push] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
