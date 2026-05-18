// src/hooks/useFCMToken.js
//
// Handles the full FCM token lifecycle:
//   1. Request notification permission
//   2. Get FCM token from Firebase
//   3. Upsert token into push_subscriptions (Supabase)
//   4. Handle token refresh (onTokenRefresh)
//   5. Delete token on opt-out
//
// Designed for free-tier: no polling, all event-driven.

import { useState, useEffect, useCallback } from "react";
import { getToken, onMessage, deleteToken } from "firebase/messaging";
import { getMessagingInstance } from "../lib/firebase";
import { supabase } from "../lib/supabaseClient";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * @param {string|null} userId — current authenticated user's UUID, or null
 */
export function useFCMToken(userId) {
  const [token, setToken] = useState(null);
  const [permission, setPermission] = useState(Notification.permission);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Register / refresh token in Supabase ───────────────────────────────
  const saveToken = useCallback(
    async (fcmToken) => {
      if (!userId || !fcmToken) return;

      // Upsert: if this device already has a row, update; otherwise insert.
      // We key on (user_id, fcm_token) to avoid duplicates across devices.
      const { error: upsertError } = await supabase
        .from("push_subscriptions")
        .upsert(
          { user_id: userId, fcm_token: fcmToken },
          { onConflict: "user_id,fcm_token" },
        );

      if (upsertError) {
        console.error("[FCM] Failed to save token:", upsertError.message);
      }
    },
    [userId],
  );

  // ── Request permission + get token ─────────────────────────────────────
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

      // Ask the browser for notification permission
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

      // Get the FCM registration token
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

  // ── Foreground message handler ──────────────────────────────────────────
  // When the app is open and in focus, FCM delivers messages here instead
  // of showing a system notification. We show our own in-app notification.
  useEffect(() => {
    if (!userId || permission !== "granted") return;

    let unsubscribe;
    (async () => {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      unsubscribe = onMessage(messaging, (payload) => {
        // Dispatch a custom event so NotificationBell / ToastContext can pick it up
        window.dispatchEvent(
          new CustomEvent("fcm-foreground-message", { detail: payload }),
        );
      });
    })();

    return () => unsubscribe?.();
  }, [userId, permission]);

  // ── Opt out / delete token ──────────────────────────────────────────────
  const revokeToken = useCallback(async () => {
    if (!userId || !token) return;
    setLoading(true);

    try {
      const messaging = await getMessagingInstance();
      if (messaging) {
        await deleteToken(messaging);
      }

      // Remove from Supabase
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
