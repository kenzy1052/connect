// src/hooks/useFCMToken.js
//
// FIXES APPLIED:
//
// BUG 1 — Toggle resets to OFF on page refresh
//   Root cause: isEnabled was derived from `permission === "granted" && !!token`.
//   The `token` state was never persisted — it lived only in React state, so it
//   vanished on every page refresh. Even though the browser still had the
//   subscription and Supabase still stored the FCM token, `token` was null,
//   making isEnabled === false.
//   Fix: On mount, load the stored FCM token from Supabase (if permission is
//   already "granted"). This re-hydrates the token state so isEnabled stays true
//   across refreshes without re-asking the user for permission.
//
// BUG 2 — "Already on" message when toggling
//   Root cause: requestPermission was being called even when Notification.permission
//   was already "granted", and getToken() silently returned the same token without
//   updating state — leaving the UI in an inconsistent place.
//   Fix: At the start of requestPermission, if permission is already "granted",
//   we skip the requestPermission() call and just ensure the token is fetched and
//   saved, then return early. The toggle in NotificationsTab already guards on
//   isEnabled, but this makes the hook itself idempotent too.

import { useState, useEffect, useCallback, useRef } from "react";
import { getMessagingInstance, fcm } from "../lib/firebase";
import { supabase } from "../lib/supabaseClient";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * @param {string|null} userId — current authenticated user's UUID, or null
 */
export function useFCMToken(userId) {
  const [token, setToken] = useState(null);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── On mount: re-hydrate FCM token from Supabase ───────────────────────
  // If the browser already granted permission (from a previous session), we
  // look up the stored FCM token in push_subscriptions so `isEnabled` stays
  // true across page refreshes without asking for permission again.
  useEffect(() => {
    if (!userId || Notification.permission !== "granted") return;

    (async () => {
      try {
        // First try to get the token directly from Firebase (fastest path)
        const messaging = await getMessagingInstance();
        if (messaging) {
          const { getToken } = await fcm();
          const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (fcmToken) {
            setToken(fcmToken);
            setPermission("granted");
            // Ensure it's persisted in case it rotated
            await saveToken(fcmToken, userId);
            return;
          }
        }

        // Fallback: read from Supabase
        const { data } = await supabase
          .from("push_subscriptions")
          .select("fcm_token")
          .eq("user_id", userId)
          .not("fcm_token", "is", null)
          .limit(1)
          .maybeSingle();

        if (data?.fcm_token) {
          setToken(data.fcm_token);
          setPermission("granted");
        }
      } catch (err) {
        console.warn("[FCM] Hydration error (non-fatal):", err?.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Register / refresh token in Supabase ───────────────────────────────
  const saveToken = useCallback(
    async (fcmToken, uid) => {
      const targetUserId = uid ?? userId;
      if (!targetUserId || !fcmToken) return;

      const { error: upsertError } = await supabase
        .from("push_subscriptions")
        .upsert(
          { user_id: targetUserId, fcm_token: fcmToken },
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

    // Guard: if permission is already granted and we have a token, nothing to do
    if (permission === "granted" && token) {
      console.log("[FCM] Already enabled — nothing to do.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const messaging = await getMessagingInstance();
      if (!messaging) {
        setError("Push notifications are not supported in this browser.");
        return;
      }

      // Only ask if not already granted
      let result = Notification.permission;
      if (result !== "granted") {
        result = await Notification.requestPermission();
      }
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
      const { getToken } = await fcm();
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
  }, [userId, permission, token, saveToken]);

  // ── Foreground message handler ──────────────────────────────────────────
  useEffect(() => {
    if (!userId || permission !== "granted") return;

    let unsubscribe;
    (async () => {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      const { onMessage } = await fcm();
      unsubscribe = onMessage(messaging, (payload) => {
        const traceId = payload.data?.traceId ?? "(no traceId)";
        console.log(
          "%c[FCM] ✓ STAGE 5/5 — Foreground push received!",
          "color: #16a34a; font-weight: bold",
          "\n  traceId:",
          traceId,
          "\n  payload:",
          payload,
        );
        window.dispatchEvent(
          new CustomEvent("fcm-foreground-message", { detail: payload }),
        );
      });
    })();

    return () => unsubscribe?.();
  }, [userId, permission]);

  // ── Opt out / delete token ──────────────────────────────────────────────
  const revokeToken = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const messaging = await getMessagingInstance();
      if (messaging) {
        const { deleteToken } = await fcm();
        await deleteToken(messaging);
      }

      // Remove all tokens for this user on this device from Supabase
      if (token) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("fcm_token", token);
      }

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
