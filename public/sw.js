/* CampusConnect Service Worker — handles Web Push + offline cache
 *
 * DEBUGGING GUIDE:
 * Open DevTools → Application → Service Workers to inspect registration.
 * Open DevTools → Application → Push Messaging to send a test push.
 * All console.log statements here appear in the SW's own console context.
 * To view them: DevTools → Sources → [your domain] → Service Workers panel.
 *
 * IMPORTANT: After editing this file, you must update CACHE_NAME to bust
 * the old SW — the browser will only install a new SW if the file has changed.
 */
const CACHE_NAME = "cc-v3"; // ← bump this whenever you change sw.js

const OFFLINE_URLS = ["/", "/index.html"];

// ─────────────────────────────────────────────────────────────────────────────
// Install — pre-cache shell
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  console.log("[SW] install event fired. Cache name:", CACHE_NAME);
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Pre-caching offline shell URLs:", OFFLINE_URLS);
        return cache.addAll(OFFLINE_URLS);
      })
      .then(() => {
        console.log("[SW] Pre-cache complete. Calling skipWaiting().");
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error("[SW] Pre-cache FAILED:", err);
      }),
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Activate — clean up old caches, claim clients
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  console.log("[SW] activate event fired.");
  e.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const toDelete = keys.filter((k) => k !== CACHE_NAME);
        if (toDelete.length) {
          console.log("[SW] Deleting stale caches:", toDelete);
        }
        return Promise.all(toDelete.map((k) => caches.delete(k)));
      })
      .then(() => self.clients.claim())
      .then(() => {
        console.log(
          "[SW] Clients claimed. Notifying open tabs of new version.",
        );
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

// ─────────────────────────────────────────────────────────────────────────────
// Fetch — network-first, fallback to cache
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  // Navigation requests: always try network first so shared links get
  // fresh OG meta tags on every load.
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

// ─────────────────────────────────────────────────────────────────────────────
// Push — receive and display a notification
//
// DEBUGGING CHECKPOINTS:
//  1. "push event received" — confirms the SW got the server's push message.
//     If this never fires, the problem is in Supabase Edge Function or VAPID.
//  2. "payload parsed" — confirms the JSON body is well-formed.
//     If this fails, the Edge Function is sending malformed JSON.
//  3. "showNotification called" — confirms we reached the display step.
//     If this fires but nothing appears, the OS is blocking it (DND mode,
//     app-level notification permission revoked, or badge icon missing).
//  4. "showNotification SUCCEEDED / FAILED" — final result.
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  // ── CHECKPOINT 1: Did the SW receive anything at all? ──────────────────────
  console.log("[SW:Push] ▶ push event received.");
  console.log("[SW:Push] e.data present?", !!e.data);

  if (!e.data) {
    // A push event with no payload is valid per spec but usually a config
    // mistake — the Edge Function forgot to include a body.
    console.warn(
      "[SW:Push] ⚠️  Push event has no data payload. " +
        "Check your Supabase send-push Edge Function: it must pass a JSON body " +
        "with { title, body, url, icon? }.",
    );
    // Show a generic fallback so the user still sees something
    e.waitUntil(
      self.registration.showNotification("CampusConnect", {
        body: "You have a new notification.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: "/" },
      }),
    );
    return;
  }

  // ── CHECKPOINT 2: Can we parse the payload as JSON? ───────────────────────
  let payload;
  try {
    payload = e.data.json();
    console.log("[SW:Push] ✅ Payload parsed successfully:", payload);
  } catch (parseErr) {
    console.error(
      "[SW:Push] ❌ Failed to parse push payload as JSON. Raw text:",
      e.data.text(),
      "Error:",
      parseErr,
    );
    // Fall back to treating the whole thing as a plain-text body
    payload = { title: "CampusConnect", body: e.data.text() };
  }

  const title = payload.title || "CampusConnect";
  const options = {
    body: payload.body || "",
    // Use icon-192.png rather than logo.png — it's already in /public and
    // is the correct PWA icon size required by Chrome on Android.
    icon: payload.icon || "/icon-192.png",
    badge: "/icon-192.png",
    image: payload.image || undefined,
    data: { url: payload.url || "/" },
    tag: payload.tag || "cc-notification",
    renotify: true,
    requireInteraction: false,
    actions: payload.actions || [],
    vibrate: [200, 100, 200],
  };

  // ── CHECKPOINT 3: Are we about to call showNotification? ──────────────────
  console.log(
    "[SW:Push] Calling showNotification with title:",
    title,
    "options:",
    options,
  );

  e.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => {
        // ── CHECKPOINT 4a: Notification displayed ─────────────────────────
        console.log(
          "[SW:Push] ✅ showNotification SUCCEEDED — notification queued for display.",
        );
      })
      .catch((err) => {
        // ── CHECKPOINT 4b: OS/browser blocked the notification ────────────
        console.error(
          "[SW:Push] ❌ showNotification FAILED. Error name:",
          err.name,
          "| Message:",
          err.message,
          "\n  Possible causes:",
          "\n  • Notification.permission is 'denied' (user blocked in OS settings)",
          "\n  • Device is in Do Not Disturb / Focus mode",
          "\n  • icon path doesn't exist (check /icon-192.png is in /public)",
          "\n  • InvalidStateError: SW is not yet active — retry after next page load",
        );
      }),
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification click — open or focus the relevant page
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  console.log(
    "[SW:NotificationClick] Notification clicked. Tag:",
    e.notification.tag,
  );
  e.notification.close();

  const targetUrl = e.notification.data?.url || "/";
  console.log("[SW:NotificationClick] Navigating to:", targetUrl);

  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        console.log(
          "[SW:NotificationClick] Open window clients found:",
          clientList.length,
        );
        // Focus existing tab if we have one
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          console.log(
            "[SW:NotificationClick] No existing tab — opening new window.",
          );
          return self.clients.openWindow(targetUrl);
        }
      })
      .catch((err) => {
        console.error("[SW:NotificationClick] Error handling click:", err);
      }),
  );
});
