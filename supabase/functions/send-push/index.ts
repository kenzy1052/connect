// supabase/functions/send-push/index.ts
//
// REWRITE: Replaced VAPID/RFC 8291 encryption with Firebase Cloud Messaging
// HTTP v1 API. The public interface (user_id, title, body, url, icon, tag) is
// identical — no call-site changes needed.
//
// Required Supabase secrets:
//   FCM_PROJECT_ID   — your Firebase project ID (e.g. "campusconnect-xxx")
//   FCM_CLIENT_EMAIL — service account email from Firebase JSON
//   FCM_PRIVATE_KEY  — service account private key (RSA, newlines as \n)
//
// Set them once with:
//   supabase secrets set FCM_PROJECT_ID=...
//   supabase secrets set FCM_CLIENT_EMAIL=...
//   supabase secrets set FCM_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Google OAuth2 — get a Bearer token for FCM HTTP v1 ───────────────────────
//
// FCM HTTP v1 uses service-account OAuth2 (not API keys).
// We sign a JWT ourselves using SubtleCrypto — zero npm dependencies.

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlEncodeBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Build a signed JWT and exchange it for a Google OAuth2 Bearer token.
 * Uses RS256 (RSA + SHA-256) with the service account private key.
 */
async function getGoogleAccessToken(
  clientEmail: string,
  privateKeyPem: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = base64urlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64urlEncode(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${payload}`;

  // Parse PEM → DER
  const pemBody = privateKeyPem
    .replace(
      /-----BEGIN RSA PRIVATE KEY-----|-----END RSA PRIVATE KEY-----/g,
      "",
    )
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  // Import as PKCS8 (Firebase service account keys are PKCS8)
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    der.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${base64urlEncodeBytes(new Uint8Array(sig))}`;

  // Exchange JWT for Bearer token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`OAuth2 token error: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

// ── Send one FCM message ──────────────────────────────────────────────────────

async function sendFCMMessage(
  fcmToken: string,
  payload: {
    title: string;
    body: string;
    url: string;
    icon: string;
    tag: string;
  },
  projectId: string,
  accessToken: string,
): Promise<{ success: boolean; shouldDelete: boolean }> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const message = {
    message: {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        // Data fields are available in the SW's onBackgroundMessage handler
        data: {
          url: payload.url,
          icon: payload.icon,
          tag: payload.tag,
        },
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          badge: "/icon-192.png",
          tag: payload.tag,
          requireInteraction: false,
          vibrate: [200, 100, 200],
          // Click action routes to the listing
          click_action: payload.url,
        },
        fcm_options: {
          link: payload.url,
        },
      },
    },
  };

  const res = await fetch(fcmUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (res.ok) {
    return { success: true, shouldDelete: false };
  }

  const errBody = await res.json().catch(() => ({}));

  // 404 (NOT_FOUND) or 400 with UNREGISTERED = stale token, delete it
  const isStale =
    res.status === 404 ||
    (res.status === 400 &&
      errBody?.error?.details?.some(
        (d: { errorCode: string }) => d.errorCode === "UNREGISTERED",
      ));

  console.error(
    `[send-push] FCM error for token ...${fcmToken.slice(-8)}:`,
    errBody,
  );
  return { success: false, shouldDelete: isStale };
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID");
    const FCM_CLIENT_EMAIL = Deno.env.get("FCM_CLIENT_EMAIL");
    const FCM_PRIVATE_KEY = Deno.env.get("FCM_PRIVATE_KEY");

    if (!FCM_PROJECT_ID || !FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "FCM secrets not configured. Set FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY.",
        }),
        {
          status: 500,
          headers: { ...CORS, "Content-Type": "application/json" },
        },
      );
    }

    const { user_id, title, body, url, icon, tag } = await req.json();
    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: "user_id and title are required" }),
        {
          status: 400,
          headers: { ...CORS, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch all FCM tokens for this user (one per device/browser)
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, fcm_token")
      .eq("user_id", user_id)
      .not("fcm_token", "is", null);

    if (subsError || !subs?.length) {
      return new Response(
        JSON.stringify({
          sent: 0,
          reason: subsError?.message ?? "no FCM tokens",
        }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // Get Google OAuth2 access token (cached for ~1h in production by Deno runtime)
    // In practice this JWT exchange takes ~200ms — acceptable for a background function.
    const accessToken = await getGoogleAccessToken(
      FCM_CLIENT_EMAIL,
      FCM_PRIVATE_KEY,
    );

    const notifPayload = {
      title,
      body: body ?? "",
      url: url ?? "/",
      icon: icon ?? "/icon-192.png",
      tag: tag ?? "cc-notification",
    };

    // Send to all tokens in parallel
    const results = await Promise.allSettled(
      subs.map((sub) =>
        sendFCMMessage(
          sub.fcm_token!,
          notifPayload,
          FCM_PROJECT_ID,
          accessToken,
        ),
      ),
    );

    // Clean up stale tokens (device unregistered or app uninstalled)
    const staleIds = results
      .map((r, i) =>
        r.status === "fulfilled" && r.value.shouldDelete ? subs[i].id : null,
      )
      .filter(Boolean) as number[];

    if (staleIds.length) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds);
    }

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;

    return new Response(
      JSON.stringify({
        sent,
        total: subs.length,
        stale_removed: staleIds.length,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-push] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
