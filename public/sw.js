/* CampusConnect Service Worker — handles Web Push + offline cache */
const CACHE_NAME = "cc-v3";
const OFFLINE_URLS = ["/", "/index.html"];

// ── Install: pre-cache shell ────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: claim clients & notify them to reload ─────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window", includeUncontrolled: true })
      )
      .then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "NEW_CONTENT" }));
      })
  );
});

// ── Fetch: network-first, fallback to cache ─────────────────────────────────
// IMPORTANT: Every code path must resolve to a real Response object.
// Returning undefined or a rejected promise from e.respondWith() causes
// "TypeError: Failed to convert value to 'Response'" and crashes the SW.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  // Navigation requests: network-first, fallback to cached index.html (SPA)
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
            .then((cached) => cached || caches.match("/index.html"))
            .then((cached) => cached || new Response("Offline", { status: 503 }))
        )
    );
    return;
  }

  // All other GET requests: network-first, fallback to cache, then 503
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(e.request)
          .then((cached) => cached || new Response("Offline", { status: 503 }))
      )
  );
});

// ── Push: show notification ─────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;

  let payload;
  try {
    payload = e.data.json();
  } catch {
    payload = { title: "CampusConnect", body: e.data.text() };
  }

  const title = payload.title || "CampusConnect";
  const options = {
    body: payload.body || "",
    // Use a data URI fallback so showNotification never fails on missing logo
    icon: payload.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    image: payload.image || undefined,
    data: { url: payload.url || "/" },
    tag: payload.tag || "cc-notification",
    renotify: true,
    requireInteraction: false,
    actions: payload.actions || [],
    vibrate: [200, 100, 200],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click: open or focus the relevant page ────────────────────
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
      })
  );
});
