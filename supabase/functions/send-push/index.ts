/**
 * send-push — Supabase Edge Function (Deno)
 *
 * Sends a properly-encrypted Web Push (RFC 8291 / aes128gcm) to all
 * subscriptions for a given user_id.
 *
 * Secrets required in Supabase → Edge Functions → Secrets:
 *   VAPID_SUBJECT     = "mailto:you@yourdomain.com"
 *   VAPID_PUBLIC_KEY  = <base64url public key from web-push generate-vapid-keys>
 *   VAPID_PRIVATE_KEY = <base64url private key from web-push generate-vapid-keys>
 *
 * POST body:
 *   { user_id, title, body, url?, icon?, tag?, image? }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@campusconnect.app";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// ── Utility helpers ─────────────────────────────────────────────────────────

const enc = new TextEncoder();

function b64u(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromB64u(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

// ── VAPID JWT signing ────────────────────────────────────────────────────────

async function importVapidPrivateKey(rawB64u: string): Promise<CryptoKey> {
  const raw = fromB64u(rawB64u);
  // VAPID private keys from web-push are raw 32-byte scalars.
  // Web Crypto requires PKCS#8 wrapping.
  const pkcs8 = new Uint8Array([
    0x30,
    0x41,
    0x02,
    0x01,
    0x00,
    0x30,
    0x13,
    0x06,
    0x07,
    0x2a,
    0x86,
    0x48,
    0xce,
    0x3d,
    0x02,
    0x01, // OID ecPublicKey
    0x06,
    0x08,
    0x2a,
    0x86,
    0x48,
    0xce,
    0x3d,
    0x03,
    0x01,
    0x07, // OID P-256
    0x04,
    0x27,
    0x30,
    0x25,
    0x02,
    0x01,
    0x01,
    0x04,
    0x20,
    ...raw,
  ]);
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function makeVapidJwt(audience: string): Promise<string> {
  const header = b64u(enc.encode(JSON.stringify({ alg: "ES256", typ: "JWT" })));
  const payload = b64u(
    enc.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: VAPID_SUBJECT,
      }),
    ),
  );
  const sigInput = `${header}.${payload}`;
  const key = await importVapidPrivateKey(VAPID_PRIVATE_KEY);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(sigInput),
  );
  return `${sigInput}.${b64u(new Uint8Array(sig))}`;
}

// ── RFC 8291 Web Push payload encryption (aes128gcm) ────────────────────────

async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const saltKey = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));
  const prkKey = await crypto.subtle.importKey("raw", prk, "HKDF", false, [
    "deriveBits",
  ]);
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info },
      prkKey,
      length * 8,
    ),
  );
}

async function encryptPush(
  plaintext: string,
  p256dhB64: string,
  authB64: string,
): Promise<{ body: Uint8Array; localPublicKey: Uint8Array; salt: Uint8Array }> {
  const receiverPublicKeyBytes = fromB64u(p256dhB64);
  const authSecret = fromB64u(authB64);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Generate server ephemeral EC key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey),
  );

  // Import receiver public key
  const receiverPublicKey = await crypto.subtle.importKey(
    "raw",
    receiverPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // ECDH shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverPublicKey },
    serverKeyPair.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // HKDF Extract: PRK = HKDF-SHA-256(salt=auth, IKM=sharedSecret)
  const authInfoBytes = enc.encode("WebPush: info\0");
  const authInfo = concat(
    authInfoBytes,
    receiverPublicKeyBytes,
    serverPublicKeyRaw,
  );
  const prk = await hkdf(sharedSecret, authSecret, authInfo, 32);

  // Derive content encryption key (16 bytes) and nonce (12 bytes)
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const cek = await hkdf(prk, salt, cekInfo, 16);
  const nonce = await hkdf(prk, salt, nonceInfo, 12);

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  const msgBytes = enc.encode(plaintext);
  // Pad with record delimiter byte (0x02)
  const padded = new Uint8Array(msgBytes.length + 1);
  padded.set(msgBytes);
  padded[msgBytes.length] = 2;

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded),
  );

  // aes128gcm content header: salt(16) + rs(4) + idlen(1) + serverKey(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const header = concat(
    salt,
    rs,
    new Uint8Array([serverPublicKeyRaw.length]),
    serverPublicKeyRaw,
  );
  const body = concat(header, ciphertext);

  return { body, localPublicKey: serverPublicKeyRaw, salt };
}

// ── Send a single push notification ─────────────────────────────────────────

async function sendToPushEndpoint(
  sub: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: string,
): Promise<Response> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await makeVapidJwt(audience);
  const { body } = await encryptPush(payload, sub.p256dh, sub.auth);

  return fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      TTL: "86400",
      Urgency: "normal",
    },
    body,
  });
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      user_id,
      title,
      body: msgBody = "",
      url = "/",
      icon = "/icon-192.png",
      tag = "cc-notification",
      image,
      badge = "/icon-192.png",
    } = body;

    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: "user_id and title are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({
          error: "VAPID keys not set in edge function secrets",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { data: subs, error: dbErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (dbErr) throw dbErr;
    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions for user" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const pushPayload = JSON.stringify({
      title,
      body: msgBody,
      url,
      icon,
      tag,
      badge,
      image,
    });

    const results = await Promise.allSettled(
      subs.map((sub) => sendToPushEndpoint(sub, pushPayload)),
    );

    // Clean up expired subscriptions (410 Gone)
    const expiredEndpoints: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.status === 410) {
        expiredEndpoints.push(subs[i].endpoint);
      }
    });
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    const sent = results.filter(
      (r) => r.status === "fulfilled" && (r.value as Response).ok,
    ).length;
    const failed = results.length - sent;

    return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("[send-push]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
