// src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Handles browser push permission + syncs to notification_preferences table.
 * Your DB already has notification_preferences with push_messages + push_listings.
 * Do NOT add push_enabled to profiles — use this table instead.
 */
export function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Load preferences from notification_preferences table ──────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!cancelled) {
          if (data) {
            setPrefs(data);
          } else {
            // Row doesn't exist yet — use defaults matching your DB schema
            setPrefs({
              user_id: user.id,
              email_messages: true,
              email_offers: true,
              email_marketing: false,
              push_messages: true,
              push_listings: true,
            });
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Request browser push permission ───────────────────────────────────────
  const requestPush = useCallback(async () => {
    if (!("Notification" in window)) {
      return { error: "Browser does not support notifications" };
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      // Upsert push_messages = true in notification_preferences
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("notification_preferences")
          .upsert(
            { user_id: user.id, push_messages: true },
            { onConflict: "user_id" },
          );

        setPrefs((prev) => ({ ...prev, push_messages: true }));

        new Notification("CampusConnect", {
          body: "Push notifications are now on!",
          icon: "/logo.png",
        });
      }
    }

    return { result };
  }, []);

  // ── Update a single preference toggle ─────────────────────────────────────
  const updatePref = useCallback(async (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value })); // optimistic

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
      // Roll back optimistic update
      setPrefs((prev) => ({ ...prev, [key]: !value }));
      return { error };
    }
    return { ok: true };
  }, []);

  return { permission, prefs, loading, requestPush, updatePref };
}
