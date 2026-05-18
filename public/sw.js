/* public/sw.js
 *
 * CampusConnect Service Worker — offline cache + foreground message relay
 *
 * NOTE ON FCM:
 *   Firebase background push messages are handled by firebase-messaging-sw.js,
 *   NOT this file. Firebase requires that exact filename and registers it
 *   separately via getToken(). Keep both files in /public.
 *
 *   This file handles:
 *     - Offline shell caching (install / activate / fetch)
 *     - Posting a NEW_CONTENT message to open tabs on SW update
 *     - Notification click routing (for any notification source)
 *
 * FIX APPLIED — "Failed to convert value to 'Response'" error:
 *   The fetch handler's catch branches previously returned undefined when
 *   caches.match() found nothing (cache miss + network failure). The browser
 *   rejected undefined as a Response, producing the console error you saw.
 *   Now every code path returns a valid Response.
 */

const CACHE_NAME = "cc-v2";
const OFFLINE_URLS = ["/", "/index.html"];

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)),
  );
  self.skipWaiting();
});

// ── Activate: purge old caches & claim clients ────────────────────────────────
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
      .then(() =>
        self.clients.matchAll({ type: "window", includeUncontrolled: true }),
      )
      .then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "NEW_CONTENT" }),
        );
      }),
  );
});

// ── Fetch: network-first, cache fallback ─────────────────────────────────────
self.addEventListener("fetch", (e) => {
  // Only handle GET requests to our own origin
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  // ── Navigation requests (HTML pages) ─────────────────────────────────────
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
          // Network failed — try cache, then fall back to /index.html shell
          caches.match(e.request).then(
            (cached) =>
              cached ||
              caches.match("/index.html") ||
              // Last resort: return a proper 503 instead of undefined
              new Response("Offline", {
                status: 503,
                statusText: "Service Unavailable",
                headers: { "Content-Type": "text/plain" },
              }),
          ),
        ),
    );
    return;
  }

  // ── Static assets (JS, CSS, images, fonts…) ───────────────────────────────
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful same-origin basic responses
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        // Network failed — serve from cache or return a 503
        caches.match(e.request).then(
          (cached) =>
            cached ||
            new Response("Offline", {
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "text/plain" },
            }),
        ),
      ),
  );
});

// ── Notification click: open or focus the relevant page ──────────────────────
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
