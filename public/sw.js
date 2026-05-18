/* public/sw.js
 *
 * CampusConnect Service Worker
 *
 * CHANGE: Added Firebase Messaging background handler for FCM.
 * The offline cache and notificationclick logic are UNCHANGED.
 *
 * How it works:
 *   - FCM delivers background push messages to this SW via the
 *     `push` event. Firebase Messaging intercepts it via importScripts.
 *   - For foreground messages, Firebase calls onMessage() in the React
 *     app (handled in useFCMToken.js) — this SW is NOT involved.
 *   - The `notificationclick` handler remains the same — works for both
 *     FCM and any other notification source.
 */

// ── Firebase Messaging SW integration ────────────────────────────────────────
// importScripts loads the Firebase Messaging SW helper. It must be at the
// top level of the service worker (not inside an event handler).
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

// Initialize Firebase inside the SW.
// These values MUST match your VITE_FIREBASE_* env vars exactly.
// Hard-code them here — Vite env vars are NOT available in the SW.
// Initialize Firebase inside the SW.
// Hard-code them here — Vite env vars are NOT available in the SW.
firebase.initializeApp({
  apiKey: "AIzaSyDxEkrE7dY-WBVC3oxme1bt4zkTyIqtYKE",
  authDomain: "campusconnect-c25d2.firebaseapp.com",
  projectId: "campusconnect-c25d2",
  storageBucket: "campusconnect-c25d2.firebasestorage.app",
  messagingSenderId: "1047423630981",
  appId: "1:1047423630981:web:4faee399a5f675d3aeb3ec",
});

// Retrieve the Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages (app is closed or not in focus)
messaging.onBackgroundMessage((payload) => {
  const { title, body, url, icon, tag } =
    payload.data ?? payload.notification ?? {};

  return self.registration.showNotification(title ?? "CampusConnect", {
    body: body ?? "",
    icon: icon ?? "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: url ?? "/" },
    tag: tag ?? "cc-notification",
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  });
});

// ── Cache configuration ───────────────────────────────────────────────────────
const CACHE_NAME = "cc-v2";
const OFFLINE_URLS = ["/", "/index.html"];

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)),
  );
  self.skipWaiting();
});

// ── Activate: claim clients & notify them to reload ───────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
      })
      .then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "NEW_CONTENT" }),
        );
      }),
  );
});

// ── Fetch: network-first, fallback to cache ───────────────────────────────────
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(e.request)
            .then((cached) => cached || caches.match("/index.html")),
        ),
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});

// ── Notification click: open or focus the relevant page ──────────────────────
// UNCHANGED from original — works for FCM notifications too.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  const targetUrl = e.notification.data?.url || "/";

  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// DEPLOY NOTE:
// The __FIREBASE_*__ placeholders above need to be replaced with your actual
// Firebase config values. You have two options:
//
// Option A (simplest for Netlify/Vite):
//   In your build script (package.json or netlify.toml), run a sed command:
//   sed -i "s/__FIREBASE_API_KEY__/$FIREBASE_API_KEY/g" dist/sw.js
//   (Add one line per placeholder)
//
// Option B (cleaner):
//   Create a `public/sw-config.js` file at build time with just:
//     const __firebase_config__ = { apiKey: "...", ... };
//   And importScripts('/sw-config.js') at the top of this file instead.
// ─────────────────────────────────────────────────────────────────────────────
