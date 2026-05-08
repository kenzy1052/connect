/**
 * send-push — Supabase Edge Function
 *
 * Sends a Web Push notification to one or all subscribers of a user.
 *
 * Deploy:
 *   supabase functions deploy send-push --no-verify-jwt
 *
 * Required secrets (set via Supabase dashboard → Edge Functions → Secrets):
 *   VAPID_SUBJECT       = mailto:you@yourdomain.com
 *   VAPID_PUBLIC_KEY    = <your public key>
 *   VAPID_PRIVATE_KEY   = <your private key>
 *
 * Generate VAPID keys:
 *   npx web-push generate-vapid-keys
 *
 * POST body JSON:
 * {
 *   user_id: "uuid",          // send to all devices of this user
 *   title: "New message",
 *   body: "You have a new message from Alex",
 *   url: "/messages",         // optional deep link
 *   icon: "/logo.png",        // optional icon
 *   tag: "message-123"        // optional dedup tag
 * }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@campusconnect.app";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ── VAPID JWT helpers ────────────────────────────────────────────────────────
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function signJwt(payload: Record<string, unknown>, privateKeyB64: string): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const enc = new TextEncoder();

  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const sigInput = `${headerB64}.${payloadB64}`;

  // Import VAPID private key (raw EC P-256)
  const rawKey = base64UrlDecode(privateKeyB64);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  ).catch(async () => {
    // Try PKCS8 if raw fails (some key formats)
    return crypto.subtle.importKey(
      "pkcs8",
      rawKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
  });

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    enc.encode(sigInput)
  );

  return `${sigInput}.${base64UrlEncode(new Uint8Array(sig))}`;
}

async function sendWebPush(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}, payload: string): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const jwt = await signJwt(
    { aud: audience, exp, sub: VAPID_SUBJECT },
    VAPID_PRIVATE_KEY
  );

  return fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      TTL: "86400",
    },
    body: new TextEncoder().encode(payload),
  });
}

// ── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const body = await req.json();
    const { user_id, title, body: msgBody, url = "/", icon = "/logo.png", tag = "default" } = body;

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch all push subscriptions for this user
    const { data: subs, error: dbErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (dbErr) throw dbErr;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const pushPayload = JSON.stringify({ title, body: msgBody, url, icon, tag });

    const results = await Promise.allSettled(
      subs.map((sub) => sendWebPush(sub, pushPayload))
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-push] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
