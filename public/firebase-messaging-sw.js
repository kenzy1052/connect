/* public/firebase-messaging-sw.js
 *
 * CampusConnect — Firebase Cloud Messaging Service Worker
 *
 * WHY THIS FILE EXISTS:
 *   Firebase's getToken() internally calls
 *   serviceWorkerRegistration.register('firebase-messaging-sw.js').
 *   That means this file MUST exist at /firebase-messaging-sw.js on
 *   your origin, served with Content-Type: text/javascript.
 *
 *   Without it, the browser fetches the Netlify SPA fallback (index.html),
 *   which has MIME type text/html — and Chrome refuses to register it as a
 *   service worker, producing the exact error you saw:
 *
 *     "The script has an unsupported MIME type ('text/html')"
 *
 * HOW IT WORKS:
 *   - Firebase delivers background push messages here via the `push` event.
 *   - For foreground messages (app open & focused), Firebase calls onMessage()
 *     in your React app (useFCMToken.js) — this SW is NOT involved then.
 *   - The notificationclick handler routes the user to the right page.
 *
 * IMPORTANT: Hard-code your Firebase config here.
 *   Vite env vars (VITE_*) are NOT available inside service workers.
 *   These values are already public (they go in your JS bundle anyway).
 */

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

// ── Firebase config — must match your VITE_FIREBASE_* env vars exactly ────────
firebase.initializeApp({
  apiKey: "AIzaSyDxEkrE7dY-WBVC3oxme1bt4zkTyIqtYKE",
  authDomain: "campusconnect-c25d2.firebaseapp.com",
  projectId: "campusconnect-c25d2",
  storageBucket: "campusconnect-c25d2.firebasestorage.app",
  messagingSenderId: "1047423630981",
  appId: "1:1047423630981:web:4faee399a5f675d3aeb3ec",
});

const messaging = firebase.messaging();

// ── Background message handler ────────────────────────────────────────────────
// Called when a push arrives while the app is closed or not in focus.
messaging.onBackgroundMessage((payload) => {
  // Prefer data fields (sent by your send-push Edge Function's webpush.data)
  // Fall back to notification fields for safety.
  const data = payload.data ?? {};
  const notification = payload.notification ?? {};

  const title = data.title ?? notification.title ?? "CampusConnect";
  const body = data.body ?? notification.body ?? "";
  const icon = data.icon ?? "/icon-192.png";
  const tag = data.tag ?? "cc-notification";
  const url = data.url ?? "/";
  const traceId = data.traceId ?? "(no traceId)";

  // ── STAGE 5/5 — Service worker received the push ──────────────────────
  console.log(
    "[firebase-messaging-sw] ✓ STAGE 5/5 — Background push received!",
    "\n  traceId:",
    traceId,
    "\n  title  :",
    title,
    "\n  body   :",
    body,
    "\n  tag    :",
    tag,
    "\n  url    :",
    url,
  );

  return self.registration.showNotification(title, {
    body,
    icon,
    // FIX — status-bar icon showing as a plain grey square:
    // Android renders the "badge" icon using ONLY its alpha channel as a
    // silhouette (same as every other app's status-bar icon). icon-192.png
    // is fully opaque (a colored square with no transparency), so Android
    // had nothing but a solid block to draw. badge-mono-96.png is a
    // transparent PNG containing just the white logo mark, so Android can
    // render it correctly as a small monochrome icon.
    badge: "/badge-mono-96.png",
    data: { url, traceId },
    tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  });
});

// ── Notification click handler ────────────────────────────────────────────────
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
