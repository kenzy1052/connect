// supabase/functions/send-push/index.ts
// Supabase Edge Function — sends Web Push notifications via VAPID.
//
// Required Supabase secrets (set via: supabase secrets set KEY=value):
//   VAPID_PUBLIC_KEY   — base64url public key from: npx web-push generate-vapid-keys
//   VAPID_PRIVATE_KEY  — base64url private key
//   VAPID_SUBJECT      — mailto: or https: URI  e.g. "mailto:admin@campusconnect.app"
//
// Invoked from the frontend with:
//   supabase.functions.invoke("send-push", {
//     body: { user_id, title, body, url, tag, icon }
//   })

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS headers ─────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Helpers: Web Push / VAPID (pure Web Crypto — no npm deps needed) ─────────

function base64urlToUint8(b64u: string): Uint8Array {
  const pad = "=".repeat((4 - (b64u.length % 4)) % 4);
  const b64 = (b64u + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function uint8ToBase64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/** Build a VAPID JWT (ES256) for the push service origin. */
async function buildVapidJwt(
  audience: string,
  subject: string,
  publicKeyB64u: string,
  privateKeyB64u: string,
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };

  const enc = new TextEncoder();
  const toSign =
    uint8ToBase64url(enc.encode(JSON.stringify(header))) +
    "." +
    uint8ToBase64url(enc.encode(JSON.stringify(payload)));

  const rawPriv = base64urlToUint8(privateKeyB64u);
  const rawPub = base64urlToUint8(publicKeyB64u);

  // Import private key (raw 32-byte scalar — need PKCS8 wrapper for SubtleCrypto)
  // Build uncompressed public key (0x04 || x || y) — but we only have the compressed
  // form from VAPID; use the private key import via PKCS8 packaging.
  const pkcs8 = buildPkcs8(rawPriv, rawPub);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      enc.encode(toSign),
    ),
  );

  return toSign + "." + uint8ToBase64url(sig);
}

/** Wrap a raw 32-byte EC private key in a minimal PKCS8 DER envelope. */
function buildPkcs8(privRaw: Uint8Array, pubRaw: Uint8Array): ArrayBuffer {
  // Build ECPrivateKey (RFC 5915)
  const ecPriv = concat([
    new Uint8Array([0x30, 0x77]), // SEQUENCE
    new Uint8Array([0x02, 0x01, 0x01]), // version = 1
    tlv(0x04, privRaw), // privateKey OCTET STRING
    new Uint8Array([0xa1, 0x44, 0x03, 0x42, 0x00]), // [1] BIT STRING header
    pubRaw, // uncompressed pub (65 bytes)
  ]);
  // Wrap in PKCS8 PrivateKeyInfo
  const oid = new Uint8Array([
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
    0x01, // id-ecPublicKey
    0x06,
    0x08,
    0x2a,
    0x86,
    0x48,
    0xce,
    0x3d,
    0x03,
    0x01,
    0x07, // P-256
  ]);
  return concat([
    new Uint8Array([0x30]),
    derLen(oid.length + 2 + ecPriv.length + 2),
    new Uint8Array([0x02, 0x01, 0x00]),
    oid,
    tlv(0x04, ecPriv),
  ]).buffer;
}

function tlv(tag: number, value: Uint8Array): Uint8Array {
  return concat([new Uint8Array([tag]), derLen(value.length), value]);
}

function derLen(n: number): Uint8Array {
  if (n < 128) return new Uint8Array([n]);
  if (n < 256) return new Uint8Array([0x81, n]);
  return new Uint8Array([0x82, (n >> 8) & 0xff, n & 0xff]);
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

/** Encrypt payload per RFC 8291 (aes128gcm) for Web Push. */
async function encryptPayload(
  payloadStr: string,
  p256dhB64u: string,
  authB64u: string,
): Promise<{
  body: Uint8Array;
  salt: Uint8Array;
  serverPublicKey: Uint8Array;
}> {
  const enc = new TextEncoder();
  const plaintext = enc.encode(payloadStr);

  const recipientPublicKeyRaw = base64urlToUint8(p256dhB64u);
  const authSecret = base64urlToUint8(authB64u);

  // Generate an ephemeral key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey),
  );

  // Import recipient public key
  const recipientPublicKey = await crypto.subtle.importKey(
    "raw",
    recipientPublicKeyRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // ECDH shared secret
  const sharedBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: recipientPublicKey },
      serverKeyPair.privateKey,
      256,
    ),
  );

  // HKDF to derive content-encryption key and nonce (RFC 8291 §3.4)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const ikm = await hkdf(
    authSecret,
    sharedBits,
    buildLabel(
      "Content-Encoding: auth\0",
      serverPublicKeyRaw,
      recipientPublicKeyRaw,
      32,
    ),
  );
  const cek = await hkdf(
    salt,
    ikm,
    buildLabel(
      "Content-Encoding: aes128gcm\0",
      serverPublicKeyRaw,
      recipientPublicKeyRaw,
      16,
    ),
  );
  const nonce = await hkdf(
    salt,
    ikm,
    buildLabel(
      "Content-Encoding: nonce\0",
      serverPublicKeyRaw,
      recipientPublicKeyRaw,
      12,
    ),
  );

  // Encrypt
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  const paddedPlaintext = concat([plaintext, new Uint8Array([2])]); // RFC 8291 padding delimiter
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      paddedPlaintext,
    ),
  );

  return { body: ciphertext, salt, serverPublicKey: serverPublicKeyRaw };
}

function buildLabel(
  info: string,
  senderPub: Uint8Array,
  recipientPub: Uint8Array,
  length: number,
): Uint8Array {
  const enc = new TextEncoder();
  const infoBytes = enc.encode(info);
  const out = new Uint8Array(
    infoBytes.length + 1 + 2 + senderPub.length + 2 + recipientPub.length + 2,
  );
  let off = 0;
  out.set(infoBytes, off);
  off += infoBytes.length;
  out[off++] = 0; // null terminator already in info string
  // key_length as uint16
  out[off++] = 0;
  out[off++] = senderPub.length;
  out.set(senderPub, off);
  off += senderPub.length;
  out[off++] = 0;
  out[off++] = recipientPub.length;
  out.set(recipientPub, off);
  off += recipientPub.length;
  out[off++] = 0;
  out[off] = length;
  return out.slice(0, out.length - 1 + 1);
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    info[info.length - 1] * 8,
  );
  return new Uint8Array(bits);
}

/** Send a single push message. Returns true on success. */
async function sendPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<boolean> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await buildVapidJwt(
    audience,
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey,
  );
  const pubKeyBytes = base64urlToUint8(vapidPublicKey);

  const { body, salt, serverPublicKey } = await encryptPayload(
    payload,
    p256dh,
    auth,
  );

  // RFC 8291 §4: build the content-encoding header
  const recordSize = body.length + 16;
  const contentEncHeader = new Uint8Array(21 + serverPublicKey.length);
  const dv = new DataView(contentEncHeader.buffer);
  contentEncHeader.set(salt, 0);
  dv.setUint32(16, recordSize, false);
  contentEncHeader[20] = serverPublicKey.length;
  contentEncHeader.set(serverPublicKey, 21);

  const bodyWithHeader = concat([contentEncHeader, body]);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Authorization: `vapid t=${jwt},k=${uint8ToBase64url(pubKeyBytes)}`,
    },
    body: bodyWithHeader,
  });

  return res.status === 201 || res.status === 200;
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT =
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@campusconnect.app";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as Supabase secrets.",
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

    // Fetch all push subscriptions for this user
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (subsError || !subs?.length) {
      return new Response(
        JSON.stringify({
          sent: 0,
          reason: subsError?.message ?? "no subscriptions",
        }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const payload = JSON.stringify({
      title,
      body: body ?? "",
      url: url ?? "/",
      icon: icon ?? "/logo.png",
      badge: "/logo.png",
      tag: tag ?? "cc-notification",
    });

    // Send to all subscriptions in parallel
    const results = await Promise.allSettled(
      subs.map((sub) =>
        sendPush(
          sub.endpoint,
          sub.p256dh,
          sub.auth,
          payload,
          VAPID_PUBLIC_KEY!,
          VAPID_PRIVATE_KEY!,
          VAPID_SUBJECT,
        ),
      ),
    );

    // Remove subscriptions that returned permanent errors (410 Gone etc.)
    const failedEndpoints = results
      .map((r, i) => (r.status === "rejected" ? subs[i].endpoint : null))
      .filter(Boolean) as string[];

    if (failedEndpoints.length) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
    }

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value === true,
    ).length;

    return new Response(JSON.stringify({ sent, total: subs.length }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-push] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
