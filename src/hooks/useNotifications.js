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

  // Register service worker early (non-blocking)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => setSwReg(reg))
      .catch((err) => console.warn("[SW]", err.message));
  }, []);

  // Load prefs from DB
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
        const { data } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
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
      } catch {
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
    if (!("Notification" in window))
      return { error: "Notifications not supported in this browser." };
    if (!("serviceWorker" in navigator))
      return { error: "Service workers not supported in this browser." };

    // ⚠️ MUST be first — no awaits before this on Chrome Android
    let result;
    try {
      result = await Notification.requestPermission();
    } catch {
      result = await new Promise((resolve) =>
        Notification.requestPermission(resolve),
      );
    }

    setPermission(result);
    if (result !== "granted") return { result };

    // Now safe to do async SW work (permission already granted)
    try {
      let reg = swReg;
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js");
        setSwReg(reg);
      }
      await navigator.serviceWorker.ready;

      if (!VAPID_PUBLIC_KEY) {
        console.warn(
          "[Push] Add VITE_VAPID_PUBLIC_KEY to .env — run: npx web-push generate-vapid-keys",
        );
        reg.showNotification("CampusConnect", {
          body: "Notifications enabled! Add VAPID keys to activate background push.",
          icon: "/logo.png",
        });
      } else {
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        if (sub) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const p256dh = sub.getKey("p256dh");
            const auth = sub.getKey("auth");
            await supabase.from("push_subscriptions").upsert(
              {
                user_id: user.id,
                endpoint: sub.endpoint,
                p256dh: p256dh
                  ? btoa(String.fromCharCode(...new Uint8Array(p256dh)))
                  : "",
                auth: auth
                  ? btoa(String.fromCharCode(...new Uint8Array(auth)))
                  : "",
              },
              { onConflict: "endpoint" },
            );
          }
        }

        reg.showNotification("CampusConnect", {
          body: "You'll now receive alerts even when the app is closed! 🎉",
          icon: "/logo.png",
          tag: "cc-welcome",
        });
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("notification_preferences")
          .upsert(
            { user_id: user.id, push_listings: true },
            { onConflict: "user_id" },
          );
        setPrefs((p) => ({ ...p, push_listings: true }));
      }
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
      return { error: err.message };
    }

    return { result };
  }, [swReg]);

  const updatePref = useCallback(async (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
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
