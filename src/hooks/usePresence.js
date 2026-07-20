import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const HEARTBEAT_MS = 30_000;
const REFETCH_MS = 20_000; // fallback if Realtime UPDATEs are throttled
const ONLINE_WINDOW_MS = 75_000; // "seen in the last 75s" = online

/**
 * Keep the current user's `last_seen_at` fresh while the tab is visible.
 * Also fires an immediate touch on mount and on tab-focus so presence
 * flips to Online right away.
 */
export function usePresenceHeartbeat(userId) {
  useEffect(() => {
    if (!userId) return;
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      // Direct table update rather than the touch_last_seen() RPC: it
      // relies only on the existing "update own profile" RLS policy,
      // so it can't be silently broken by an RPC not being exposed in
      // PostgREST's schema cache. Logged on failure so a broken
      // presence heartbeat is visible in the console instead of just
      // never updating last_seen_at.
      supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", userId)
        .then(({ error }) => {
          if (error) console.error("presence heartbeat failed:", error);
        });
    };
    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);
    window.addEventListener("focus", beat);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", beat);
      window.removeEventListener("focus", beat);
    };
  }, [userId]);
}

export function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

export function formatLastSeen(lastSeenAt) {
  if (!lastSeenAt) return "Offline";
  const seen = new Date(lastSeenAt);
  const diff = Date.now() - seen.getTime();
  if (diff < ONLINE_WINDOW_MS) return "Online";

  const time = seen.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const now = new Date();
  const isToday = seen.toDateString() === now.toDateString();
  if (isToday) return `Last seen today at ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (seen.toDateString() === yesterday.toDateString()) {
    return `Last seen yesterday at ${time}`;
  }

  const daysAgo = Math.floor(diff / 86_400_000);
  if (daysAgo < 7) {
    const weekday = seen.toLocaleDateString([], { weekday: "long" });
    return `Last seen ${weekday} at ${time}`;
  }

  const date = seen.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: seen.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
  return `Last seen ${date} at ${time}`;
}

/**
 * Live presence for another user. Combines:
 *   - initial fetch of profiles.last_seen_at
 *   - Realtime UPDATE subscription on that row
 *   - 20s poll fallback (in case Realtime UPDATE events are throttled)
 *   - 15s local tick so "Online" flips to "Last seen ..." without a network call
 */
export function useOtherPartyPresence(otherUserId) {
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!otherUserId) return;
    let cancelled = false;

    const fetchOnce = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("last_seen_at")
        .eq("id", otherUserId)
        .maybeSingle();
      if (!cancelled && data) setLastSeenAt(data.last_seen_at);
    };
    fetchOnce();

    const channelName = `presence:${otherUserId}`;
    const stale = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${channelName}`);
    if (stale) supabase.removeChannel(stale);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${otherUserId}`,
        },
        (payload) => setLastSeenAt(payload.new.last_seen_at),
      )
      .subscribe();

    const poll = setInterval(fetchOnce, REFETCH_MS);
    const tick = setInterval(() => forceTick((n) => n + 1), 15_000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [otherUserId]);

  return {
    lastSeenAt,
    label: formatLastSeen(lastSeenAt),
    online: isOnline(lastSeenAt),
  };
}
