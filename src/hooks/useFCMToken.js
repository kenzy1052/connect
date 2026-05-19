// src/hooks/useFCMToken.js
import { useState, useEffect, useCallback } from "react";
import { getToken, onMessage, deleteToken } from "firebase/messaging";
import { getMessagingInstance } from "../lib/firebase";
import { supabase } from "../lib/supabaseClient";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function useFCMToken(userId) {
  const [token, setToken] = useState(null);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [loading, setLoading] = useState(true); // true while restoring on mount
  const [error, setError] = useState(null);

  // ── RESTORE token on mount (fixes toggle resetting to OFF after refresh) ────
  // getToken() does NOT prompt the user — it silently returns the cached
  // FCM registration token if permission is already granted and the SW push
  // subscription is still active.
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (
          typeof Notification === "undefined" ||
          Notification.permission !== "granted"
        ) {
          setLoading(false);
          return;
        }
        const messaging = await getMessagingInstance();
        if (!messaging || cancelled) {
          setLoading(false);
          return;
        }

        const existingToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
        });
        if (existingToken && !cancelled) {
          setToken(existingToken);
          // Keep Supabase in sync — token may have quietly rotated
          await supabase
            .from("push_subscriptions")
            .upsert(
              { user_id: userId, fcm_token: existingToken },
              { onConflict: "user_id,fcm_token" },
            );
        }
      } catch (err) {
        console.warn("[FCM] Could not restore token on mount:", err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveToken = useCallback(
    async (fcmToken) => {
      if (!userId || !fcmToken) return;
      const { error: upsertError } = await supabase
        .from("push_subscriptions")
        .upsert(
          { user_id: userId, fcm_token: fcmToken },
          { onConflict: "user_id,fcm_token" },
        );
      if (upsertError)
        console.error("[FCM] Failed to save token:", upsertError.message);
    },
    [userId],
  );

  const requestPermission = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) {
        setError("Push notifications are not supported in this browser.");
        return;
      }

      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setError(
          result === "denied"
            ? "Notifications are blocked. Enable them in your browser settings."
            : "Notification permission was not granted.",
        );
        return;
      }

      const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (!fcmToken) {
        setError("Could not get push token. Try again later.");
        return;
      }

      setToken(fcmToken);
      await saveToken(fcmToken);
    } catch (err) {
      console.error("[FCM] requestPermission error:", err);
      setError("Failed to enable notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId, saveToken]);

  useEffect(() => {
    if (!userId || permission !== "granted") return;
    let unsubscribe;
    (async () => {
      const messaging = await getMessagingInstance();
      if (!messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
        window.dispatchEvent(
          new CustomEvent("fcm-foreground-message", { detail: payload }),
        );
      });
    })();
    return () => unsubscribe?.();
  }, [userId, permission]);

  const revokeToken = useCallback(async () => {
    if (!userId || !token) return;
    setLoading(true);
    try {
      const messaging = await getMessagingInstance();
      if (messaging) await deleteToken(messaging);
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("fcm_token", token);
      setToken(null);
      setPermission("default");
    } catch (err) {
      console.error("[FCM] revokeToken error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  return {
    token,
    permission,
    loading,
    error,
    requestPermission,
    revokeToken,
    isEnabled: permission === "granted" && !!token,
  };
}
