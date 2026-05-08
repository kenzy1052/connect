// src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/** Convert VAPID base64 key to Uint8Array for pushManager.subscribe */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [swReg, setSwReg] = useState(null);

  // Register service worker on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => setSwReg(reg))
      .catch((err) => console.warn("[SW] Registration failed:", err.message));
  }, []);

  // Load notification preferences from DB
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) {
          setPrefs(data || {
            user_id: user.id,
            email_messages: true,
            email_offers: true,
            email_marketing: false,
            push_messages: true,
            push_listings: true,
          });
          setLoading(false);
        }
      } catch { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Request push permission + subscribe via Web Push API
  const requestPush = useCallback(async () => {
    if (!("Notification" in window)) return { error: "Browser does not support notifications" };

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") return { result };

    try {
      const reg = swReg || (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;

      if (!VAPID_PUBLIC_KEY) {
        console.warn("[Push] VITE_VAPID_PUBLIC_KEY not set. Run: npx web-push generate-vapid-keys");
        reg.showNotification("CampusConnect", {
          body: "Notifications enabled (add VAPID keys for background push)",
          icon: "/logo.png",
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("notification_preferences")
            .upsert({ user_id: user.id, push_messages: true }, { onConflict: "user_id" });
          setPrefs((p) => ({ ...p, push_messages: true }));
        }
        return { result, warning: "VAPID key missing" };
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user && sub) {
        const p256dhArr = sub.getKey("p256dh");
        const authArr = sub.getKey("auth");
        await supabase.from("push_subscriptions").upsert({
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: p256dhArr ? btoa(String.fromCharCode(...new Uint8Array(p256dhArr))) : "",
          auth: authArr ? btoa(String.fromCharCode(...new Uint8Array(authArr))) : "",
        }, { onConflict: "endpoint" });
        await supabase.from("notification_preferences")
          .upsert({ user_id: user.id, push_messages: true }, { onConflict: "user_id" });
        setPrefs((p) => ({ ...p, push_messages: true }));
      }

      reg.showNotification("CampusConnect", {
        body: "You'll now get alerts even when the app is closed! 🎉",
        icon: "/logo.png",
        tag: "cc-welcome",
      });
    } catch (err) {
      console.error("[Push] Subscribe failed:", err);
      return { error: err.message };
    }
    return { result };
  }, [swReg]);

  const updatePref = useCallback(async (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("notification_preferences").upsert(
      { user_id: user.id, [key]: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) { setPrefs((prev) => ({ ...prev, [key]: !value })); return { error }; }
    return { ok: true };
  }, []);

  return { permission, prefs, loading, requestPush, updatePref };
}
