/* CampusConnect Service Worker — handles Web Push + offline cache */
const CACHE_NAME = "cc-v1";
const OFFLINE_URLS = ["/", "/index.html"];

// ── Install: pre-cache shell ────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: claim clients ─────────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// ── Fetch: network-first, fallback to cache ─────────────────────────────────
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
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
    icon: payload.icon || "/logo.png",
    badge: "/logo.png",
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
        // Focus existing tab if URL matches
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
