// supabase/functions/send-push/index.ts
//
// UPDATED: Now handles two call shapes:
//
//   Shape A — Direct call (existing behaviour, unchanged):
//     { user_id, title, body, url, icon, tag }
//
//   Shape B — Database Webhook from push_queue table (new):
//     { type: "INSERT", record: { user_id, title, body, url, icon, tag, ... } }
//
// Everything else (FCM HTTP v1, OAuth2 JWT, stale token cleanup) is unchanged.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Google OAuth2 — get a Bearer token for FCM HTTP v1 ───────────────────────

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlEncodeBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

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

  const pemBody = privateKeyPem
    .replace(
      /-----BEGIN RSA PRIVATE KEY-----|-----END RSA PRIVATE KEY-----/g,
      "",
    )
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

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
    traceId: string;
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
        data: {
          url: payload.url,
          icon: payload.icon,
          tag: payload.tag,
          title: payload.title,
          body: payload.body,
          traceId: payload.traceId,
        },
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          // FIX — Android status-bar showed a solid square instead of the
          // logo silhouette: badge must be a transparent PNG (alpha-only
          // mask), not the opaque colored app icon. See firebase-messaging-sw.js
          // for the matching fix on the client-side showNotification() call.
          badge: "/badge-mono-96.png",
          tag: payload.tag,
          requireInteraction: false,
          vibrate: [200, 100, 200],
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

  if (res.ok) return { success: true, shouldDelete: false };

  const errBody = await res.json().catch(() => ({}));

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
    // ── Log immediately on entry — visible even if secrets are missing ────
    console.log("[send-push] ▶ Function invoked. Checking FCM secrets…");

    const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID");
    const FCM_CLIENT_EMAIL = Deno.env.get("FCM_CLIENT_EMAIL");
    const FCM_PRIVATE_KEY = Deno.env.get("FCM_PRIVATE_KEY");

    if (!FCM_PROJECT_ID || !FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) {
      console.error(
        "[send-push] ✗ MISSING SECRETS — set FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY in Supabase Dashboard → Edge Functions → send-push → Secrets.",
        `\n  FCM_PROJECT_ID  : ${FCM_PROJECT_ID ? "✓ set" : "✗ MISSING"}`,
        `\n  FCM_CLIENT_EMAIL: ${FCM_CLIENT_EMAIL ? "✓ set" : "✗ MISSING"}`,
        `\n  FCM_PRIVATE_KEY : ${FCM_PRIVATE_KEY ? "✓ set" : "✗ MISSING"}`,
      );
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

    const rawBody = await req.json();

    // ── Normalise: handle both direct calls and Database Webhook payloads ──
    // Webhook shape: { type: "INSERT", record: { user_id, title, ... } }
    // Direct shape:  { user_id, title, ... }
    const params =
      rawBody?.type === "INSERT" && rawBody?.record ? rawBody.record : rawBody;

    const {
      user_id,
      title,
      body,
      url,
      icon,
      tag,
      traceId: incomingTraceId,
    } = params as {
      user_id: string;
      title: string;
      body?: string;
      url?: string;
      icon?: string;
      tag?: string;
      traceId?: string;
    };

    // Use the traceId from the caller, or mint a new one for webhook-triggered calls
    const traceId = incomingTraceId ?? `ef_${Date.now().toString(36)}`;
    console.log(`[send-push][${traceId}] ▶ STAGE 3/5 — Edge function invoked`, {
      user_id,
      title,
      tag,
    });

    if (!user_id || !title) {
      console.error(`[send-push][${traceId}] ✗ Missing user_id or title`);
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

    // Fetch all FCM tokens for this user
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, fcm_token")
      .eq("user_id", user_id)
      .not("fcm_token", "is", null);

    if (subsError || !subs?.length) {
      console.warn(
        `[send-push][${traceId}] ✗ STAGE 3 FAIL — No FCM tokens found for user_id=${user_id}`,
        subsError?.message ??
          "push_subscriptions returned 0 rows. Has this user enabled notifications?",
      );
      return new Response(
        JSON.stringify({
          sent: 0,
          traceId,
          reason: subsError?.message ?? "no FCM tokens",
        }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    console.log(
      `[send-push][${traceId}] ✓ Found ${subs.length} FCM token(s) for user_id=${user_id}`,
    );

    // ── Normalize FCM_PRIVATE_KEY newlines ────────────────────────────────
    // Secrets dashboards (Supabase, Netlify, Vercel, etc.) store the private
    // key with literal \n sequences instead of real newlines. If left as-is,
    // atob() inside getGoogleAccessToken throws "InvalidCharacterError"
    // because backslash-n is not valid base64 — and that exception bubbles up
    // as a generic 500 with no helpful message.
    // Normalise both \\n (double-escaped) and \n (single-escaped) to real newlines.
    const normalizedPrivateKey = FCM_PRIVATE_KEY.replace(/\\\\n/g, "\n") // double-escaped \\n → real newline
      .replace(/\\n/g, "\n"); // single-escaped \n  → real newline

    console.log(
      `[send-push][${traceId}] Calling Google OAuth2 for access token…`,
      `\n  client_email: ${FCM_CLIENT_EMAIL}`,
      `\n  key starts with: ${normalizedPrivateKey.slice(0, 36)}…`,
    );

    const accessToken = await getGoogleAccessToken(
      FCM_CLIENT_EMAIL,
      normalizedPrivateKey,
    );

    console.log(
      `[send-push][${traceId}] ✓ STAGE 4a/5 — OAuth2 access token obtained`,
    );

    const notifPayload = {
      title,
      body: body ?? "",
      url: url ?? "/",
      icon: icon ?? "/icon-192.png",
      tag: tag ?? "cc-notification",
      traceId,
    };

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

    // Log per-token outcome
    results.forEach((r, i) => {
      const tokenSuffix = subs[i].fcm_token?.slice(-8) ?? "????????";
      if (r.status === "fulfilled") {
        if (r.value.success) {
          console.log(
            `[send-push][${traceId}] ✓ STAGE 4b/5 — FCM accepted token ...${tokenSuffix}`,
          );
        } else {
          console.error(
            `[send-push][${traceId}] ✗ STAGE 4b/5 — FCM rejected token ...${tokenSuffix}`,
            r.value.shouldDelete ? "(stale — will delete)" : "",
          );
        }
      } else {
        console.error(
          `[send-push][${traceId}] ✗ STAGE 4b/5 — FCM call threw for token ...${tokenSuffix}:`,
          r.reason,
        );
      }
    });

    // Clean up stale tokens
    const staleIds = results
      .map((r, i) =>
        r.status === "fulfilled" && r.value.shouldDelete ? subs[i].id : null,
      )
      .filter(Boolean) as string[];

    if (staleIds.length) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds);
    }

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;

    console.log(
      `[send-push][${traceId}] ═══ SUMMARY ═══`,
      `sent=${sent}/${subs.length}`,
      `stale_removed=${staleIds.length}`,
    );

    return new Response(
      JSON.stringify({
        sent,
        total: subs.length,
        stale_removed: staleIds.length,
        traceId,
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
