/**
 * useNotifications.js — Web Push subscription + notification preferences
 *
 * DEBUGGING GUIDE:
 * Every critical step is logged to the browser console with a [Push] prefix.
 * Open DevTools → Console and filter by "[Push]" to trace the entire flow.
 *
 * Common failure points and what to look for:
 *
 *  A) SW registration fails  → "[Push] SW registration FAILED"
 *     Fix: Check /public/sw.js exists and MIME type is text/javascript.
 *
 *  B) Permission denied      → "[Push] Permission result: denied"
 *     Fix: User must manually re-enable in browser Settings → Notifications.
 *
 *  C) VAPID key missing      → "[Push] ⚠️  VITE_VAPID_PUBLIC_KEY is not set"
 *     Fix: Add VITE_VAPID_PUBLIC_KEY to Netlify → Site Settings → Env Vars.
 *
 *  D) subscribe() fails      → "[Push] ❌ pushManager.subscribe FAILED"
 *     - InvalidStateError: SW not yet active — reload and retry.
 *     - NotAllowedError: OS-level permission blocked (check phone settings).
 *     - Check VAPID key format: must be URL-safe base64 (no +, /, = chars).
 *
 *  E) Supabase upsert fails  → "[Push] ❌ Failed to save subscription"
 *     Fix: Check push_subscriptions table RLS — service role or anon key
 *     needs INSERT permission. Verify table schema matches the upsert payload.
 *
 *  F) showNotification fails  → Logged in sw.js CHECKPOINT 4b (see sw.js).
 *     Fix: Check OS notification permission, DND mode, icon path.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [swReg, setSwReg] = useState(null);

  // ── Register service worker early (non-blocking) ──────────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      console.warn("[Push] ServiceWorker API not available in this browser.");
      return;
    }

    console.log("[Push] Registering service worker at /sw.js …");

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log(
          "[Push] ✅ SW registered successfully.",
          "| State:",
          reg.installing?.state ||
            reg.waiting?.state ||
            reg.active?.state ||
            "unknown",
          "| Scope:",
          reg.scope,
        );
        setSwReg(reg);
      })
      .catch((err) => {
        console.error(
          "[Push] ❌ SW registration FAILED.",
          "| Error:",
          err.message,
          "\n  Check: Does /public/sw.js exist? Is HTTPS active?",
        );
      });
  }, []);

  // ── Load notification preferences from DB ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const { data, error: prefErr } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (prefErr) {
          console.warn(
            "[Push] Failed to load notification preferences:",
            prefErr.message,
          );
        }

        if (!cancelled) {
          setPrefs(
            data || {
              user_id: user.id,
              email_messages: true,
              email_offers: true,
              email_marketing: false,
              push_messages: true,
              push_listings: true,
            },
          );
          setLoading(false);
        }
      } catch (e) {
        console.error("[Push] Unexpected error loading prefs:", e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * requestPush — called directly from a user click event.
   *
   * CRITICAL: On Chrome Android, Notification.requestPermission() MUST be
   * the very first await in the handler — before any other async operations —
   * otherwise Chrome loses the "trusted user gesture" context and blocks the
   * permission prompt with "This site can't ask for your permission."
   */
  const requestPush = useCallback(async () => {
    console.log("[Push] requestPush() called.");

    // ── CHECKPOINT A: Browser support ─────────────────────────────────────
    if (!("Notification" in window)) {
      console.error(
        "[Push] ❌ Notification API not supported in this browser.",
      );
      return { error: "Notifications not supported in this browser." };
    }
    if (!("serviceWorker" in navigator)) {
      console.error(
        "[Push] ❌ ServiceWorker API not supported in this browser.",
      );
      return { error: "Service workers not supported in this browser." };
    }

    console.log(
      "[Push] Current Notification.permission:",
      Notification.permission,
    );

    // ── CHECKPOINT B: Request OS permission (MUST be first await) ─────────
    let result;
    try {
      console.log("[Push] Calling Notification.requestPermission() …");
      result = await Notification.requestPermission();
    } catch {
      // Legacy callback-style API (some older iOS WebViews)
      console.log("[Push] Falling back to callback-style requestPermission …");
      result = await new Promise((resolve) =>
        Notification.requestPermission(resolve),
      );
    }

    console.log("[Push] Permission result:", result);
    setPermission(result);

    if (result !== "granted") {
      if (result === "denied") {
        console.error(
          "[Push] ❌ Permission DENIED by user.",
          "\n  To fix: User must go to browser Settings → Notifications",
          "→ find this site → set to Allow.",
        );
      } else {
        console.warn("[Push] Permission not granted. Result:", result);
      }
      return { result };
    }

    console.log("[Push] ✅ Permission granted. Proceeding with subscription …");

    try {
      // ── CHECKPOINT C: Ensure SW is registered + ready ─────────────────
      let reg = swReg;
      if (!reg) {
        console.log("[Push] No cached SW registration — registering now …");
        reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        setSwReg(reg);
        console.log("[Push] ✅ SW registered (from requestPush):", reg.scope);
      }

      console.log("[Push] Waiting for navigator.serviceWorker.ready …");
      const readyReg = await navigator.serviceWorker.ready;
      console.log(
        "[Push] ✅ SW is ready.",
        "Active state:",
        readyReg.active?.state,
      );

      // ── CHECKPOINT D: VAPID key validation ────────────────────────────
      if (!VAPID_PUBLIC_KEY) {
        console.error(
          "[Push] ⚠️  VITE_VAPID_PUBLIC_KEY is not set!",
          "\n  1. Run: npx web-push generate-vapid-keys",
          "\n  2. Add VITE_VAPID_PUBLIC_KEY to Netlify Environment Variables",
          "\n  3. Add VAPID_PRIVATE_KEY to Supabase Edge Function secrets",
          "\n  For now, showing a local-only test notification …",
        );
        readyReg.showNotification("CampusConnect", {
          body: "Notifications enabled! Add VAPID keys to activate background push.",
          icon: "/icon-192.png",
        });
        return { result };
      }

      console.log(
        "[Push] VAPID public key found. Length:",
        VAPID_PUBLIC_KEY.length,
        "| First 20 chars:",
        VAPID_PUBLIC_KEY.slice(0, 20) + "…",
      );

      // ── CHECKPOINT E: Get or create push subscription ─────────────────
      console.log("[Push] Checking for existing push subscription …");
      let sub = await readyReg.pushManager.getSubscription();

      if (sub) {
        console.log(
          "[Push] ✅ Existing subscription found. Endpoint (truncated):",
          sub.endpoint.slice(0, 60) + "…",
        );
      } else {
        console.log(
          "[Push] No existing subscription. Calling pushManager.subscribe() …",
        );
        try {
          sub = await readyReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
          console.log(
            "[Push] ✅ New subscription created. Endpoint (truncated):",
            sub.endpoint.slice(0, 60) + "…",
          );
        } catch (subErr) {
          console.error(
            "[Push] ❌ pushManager.subscribe FAILED.",
            "| Name:",
            subErr.name,
            "| Message:",
            subErr.message,
            "\n  If InvalidStateError → SW not active yet; reload and retry.",
            "\n  If NotAllowedError  → OS notification permission revoked.",
            "\n  If DOMException     → VAPID key may be malformed (must be URL-safe base64).",
          );
          return { error: subErr.message };
        }
      }

      // ── CHECKPOINT F: Save subscription to Supabase ───────────────────
      if (sub) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.warn(
            "[Push] ⚠️  No authenticated user — cannot save subscription.",
          );
        } else {
          const p256dh = sub.getKey("p256dh");
          const auth = sub.getKey("auth");

          // Keys must be base64url (URL-safe base64, no padding) because
          // the send-push Edge Function decodes them with fromB64u().
          const toBase64Url = (buf) =>
            btoa(String.fromCharCode(...new Uint8Array(buf)))
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=/g, "");

          const subPayload = {
            user_id: user.id,
            endpoint: sub.endpoint,
            p256dh: p256dh ? toBase64Url(p256dh) : "",
            auth: auth ? toBase64Url(auth) : "",
          };

          console.log(
            "[Push] Saving subscription to Supabase. user_id:",
            user.id,
            "| endpoint (truncated):",
            sub.endpoint.slice(0, 40) + "…",
          );

          const { error: upsertErr } = await supabase
            .from("push_subscriptions")
            .upsert(subPayload, { onConflict: "endpoint" });

          if (upsertErr) {
            console.error(
              "[Push] ❌ Failed to save subscription to Supabase.",
              "| Code:",
              upsertErr.code,
              "| Message:",
              upsertErr.message,
              "\n  Check push_subscriptions table RLS policy — ensure authenticated",
              "users can INSERT/UPSERT their own rows.",
            );
          } else {
            console.log(
              "[Push] ✅ Subscription saved to Supabase successfully.",
            );
          }
        }
      }

      // ── CHECKPOINT G: Show confirmation notification ───────────────────
      console.log("[Push] Showing welcome notification …");
      try {
        await readyReg.showNotification("CampusConnect", {
          body: "You'll now receive alerts even when the app is closed! 🎉",
          icon: "/icon-192.png",
          // FIX — was "/icon-192.png" (opaque), which Android rendered as a
          // solid square in the status bar. See firebase-messaging-sw.js for
          // the full explanation.
          badge: "/badge-mono-96.png",
          tag: "cc-welcome",
        });
        console.log("[Push] ✅ Welcome notification shown.");
      } catch (notifErr) {
        console.error(
          "[Push] ❌ showNotification failed for welcome message.",
          "| Name:",
          notifErr.name,
          "| Message:",
          notifErr.message,
          "\n  This usually means the OS blocked it (DND / Focus mode)",
          "or the icon path is wrong (check /icon-192.png exists).",
        );
      }

      // ── CHECKPOINT H: Persist push preference in DB ───────────────────
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        console.log("[Push] Updating notification_preferences in DB …");
        const { error: prefErr } = await supabase
          .from("notification_preferences")
          .upsert(
            { user_id: user.id, push_listings: true },
            { onConflict: "user_id" },
          );
        if (prefErr) {
          console.warn(
            "[Push] ⚠️  Failed to update notification_preferences:",
            prefErr.message,
          );
        } else {
          console.log("[Push] ✅ Notification preferences updated.");
        }
        setPrefs((p) => ({ ...p, push_listings: true }));
      }
    } catch (err) {
      console.error(
        "[Push] ❌ Unexpected error in push setup:",
        err.name,
        err.message,
        err,
      );
      return { error: err.message };
    }

    console.log("[Push] ✅ Push notification setup complete.");
    return { result };
  }, [swReg]);

  const updatePref = useCallback(async (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        [key]: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      setPrefs((prev) => ({ ...prev, [key]: !value }));
      return { error };
    }
    return { ok: true };
  }, []);

  return { permission, prefs, loading, requestPush, updatePref };
}
