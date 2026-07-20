import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Manages a single conversation thread.
 *
 * Person-scoped: reuses an existing active conversation with the seller
 * (any listing) so a second message from the same seller continues the
 * existing thread rather than opening a new chat.
 */
export function useConversation({
  listingId,
  currentUserId,
  conversationId = null,
  sellerId = null,
  enabled = true,
}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!currentUserId || !enabled) return;
    if (!conversationId && !listingId && !sellerId) return;
    setLoading(true);
    setError(null);

    let convo = null;

    if (conversationId) {
      const { data, error: findErr } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();
      if (findErr) {
        setError(findErr.message);
        setLoading(false);
        return;
      }
      convo = data;
    } else if (sellerId && listingId) {
      // Person-scoped: reuse any existing active thread with this seller.
      const { data, error: rpcErr } = await supabase.rpc(
        "find_or_create_direct_chat",
        { p_seller_id: sellerId, p_listing_id: listingId },
      );
      if (rpcErr) {
        setError(rpcErr.message);
        setLoading(false);
        return;
      }
      convo = data;
    } else if (listingId) {
      const { data, error: rpcErr } = await supabase.rpc(
        "find_or_create_conversation",
        { p_listing_id: listingId },
      );
      if (rpcErr) {
        setError(rpcErr.message);
        setLoading(false);
        return;
      }
      convo = data;
    }

    setConversation(convo);

    if (!convo?.id) {
      setLoading(false);
      return;
    }

    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true });

    if (msgErr) setError(msgErr.message);
    setMessages(msgs || []);
    setLoading(false);

    // Mark as read immediately when opening the conversation. Person-scoped
    // (not just this one conversation row) so an older thread with the same
    // person doesn't keep the unread badge alive after refresh.
    const otherId = sellerId || (convo.buyer_id === currentUserId ? convo.seller_id : convo.buyer_id);
    if (otherId) supabase.rpc("mark_person_read", { p_other_id: otherId });
  }, [listingId, currentUserId, conversationId, sellerId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: new messages + read-receipt updates
  useEffect(() => {
    if (!conversation?.id) return;

    const channelName = `conversation:${conversation.id}`;
    const stale = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${channelName}`);
    if (stale) supabase.removeChannel(stale);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new],
          );
          // Auto-mark read if the incoming message is from the other party.
          if (payload.new.sender_id !== currentUserId) {
            supabase.rpc("mark_person_read", {
              p_other_id: payload.new.sender_id,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? payload.new : m)),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [conversation?.id, currentUserId]);

  // ── Send text message ──────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (body) => {
      const trimmed = (body || "").trim();
      if (!trimmed || !conversation?.id || !currentUserId)
        return { error: "Empty message" };
      setSending(true);
      const { data, error: sendErr } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id: conversation.id,
            sender_id: currentUserId,
            body: trimmed,
          },
        ])
        .select()
        .single();
      setSending(false);
      if (sendErr) return { error: sendErr.message };
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data],
      );
      return { data };
    },
    [conversation?.id, currentUserId],
  );

  // ── Send voice message ─────────────────────────────────────────────────
  const sendVoice = useCallback(
    async (blob, durationMs) => {
      if (!blob || !conversation?.id || !currentUserId)
        return { error: "No recording" };
      setSending(true);
      const path = `${currentUserId}/${crypto.randomUUID()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("voice-messages")
        .upload(path, blob, {
          contentType: blob.type || "audio/webm",
          upsert: false,
        });
      if (upErr) {
        setSending(false);
        return { error: upErr.message };
      }
      const { data, error: insErr } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id: conversation.id,
            sender_id: currentUserId,
            body: "🎤 Voice message",
            voice_path: path,
            voice_duration_ms: Math.round(durationMs),
          },
        ])
        .select()
        .single();
      setSending(false);
      if (insErr) return { error: insErr.message };
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data],
      );
      return { data };
    },
    [conversation?.id, currentUserId],
  );

  // ── Clear all messages with this person (every thread, not just this row) ──
  // Uses clear_person_chat RPC: messages/conversations have no participant
  // UPDATE or DELETE policy, so a direct .delete() call here would silently
  // affect zero rows under RLS.
  const clearMessages = useCallback(async () => {
    if (!conversation?.id) return { error: "No conversation" };
    const otherId =
      sellerId ||
      (conversation.buyer_id === currentUserId ? conversation.seller_id : conversation.buyer_id);
    if (!otherId) return { error: "Unknown participant" };
    const { error: rpcErr } = await supabase.rpc("clear_person_chat", {
      p_other_id: otherId,
    });
    if (!rpcErr) setMessages([]);
    return { error: rpcErr?.message };
  }, [conversation?.id, conversation?.buyer_id, conversation?.seller_id, currentUserId, sellerId]);

  // ── Delete every conversation thread with this person ───────────────────
  const deleteConversation = useCallback(async () => {
    if (!conversation?.id) return { error: "No conversation" };
    const otherId =
      sellerId ||
      (conversation.buyer_id === currentUserId ? conversation.seller_id : conversation.buyer_id);
    if (!otherId) return { error: "Unknown participant" };
    const { error: rpcErr } = await supabase.rpc("delete_person_conversation", {
      p_other_id: otherId,
    });
    return { error: rpcErr?.message };
  }, [conversation?.id, conversation?.buyer_id, conversation?.seller_id, currentUserId, sellerId]);

  return {
    conversation,
    messages,
    loading,
    sending,
    error,
    sendMessage,
    sendVoice,
    clearMessages,
    deleteConversation,
    isClosed: conversation?.status === "closed",
  };
}

/**
 * Tracks whether the current user has blocked, or is blocked by, another
 * person — and exposes block()/unblock(). Backed directly by the
 * blocked_users table (RLS already scopes reads/writes to rows the caller
 * is part of), no RPC needed.
 */
export function useBlockStatus(currentUserId, otherUserId) {
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!currentUserId || !otherUserId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("blocked_users")
      .select("blocker_id, blocked_id")
      .or(
        `and(blocker_id.eq.${currentUserId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${currentUserId})`,
      );
    setBlockedByMe(!!data?.some((r) => r.blocker_id === currentUserId));
    setBlockedByThem(!!data?.some((r) => r.blocker_id === otherUserId));
    setLoading(false);
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const block = useCallback(async () => {
    if (!currentUserId || !otherUserId) return { error: "Unknown user" };
    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: currentUserId, blocked_id: otherUserId });
    if (!error) setBlockedByMe(true);
    return { error: error?.message };
  }, [currentUserId, otherUserId]);

  const unblock = useCallback(async () => {
    if (!currentUserId || !otherUserId) return { error: "Unknown user" };
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", currentUserId)
      .eq("blocked_id", otherUserId);
    if (!error) setBlockedByMe(false);
    return { error: error?.message };
  }, [currentUserId, otherUserId]);

  return { blockedByMe, blockedByThem, loading, block, unblock, refresh };
}

/**
 * Inbox list hook.
 *
 * Groups conversations by the OTHER participant so a given person appears
 * once even if there are multiple listing threads (WhatsApp behaviour).
 * Unread counts stay live via Realtime + a 25 s presence poll.
 *
 * Fix: pendingReadRef is keyed by the OTHER PERSON's id (not a single
 * conversation id) so it lines up with mark_person_read, which marks every
 * thread with that person read at once. Marking is person-scoped because
 * the inbox itself is grouped by person — a buyer/seller pair can have more
 * than one conversations row over time (e.g. an old one closed when a
 * listing sold, then a new one for a different listing), and previously
 * only the most-recently-opened row ever got marked read, so unread
 * messages sitting in an older thread kept bringing the badge back after
 * every refresh.
 */
export function useConversationsList(currentUserId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tracks other-person ids marked read locally but whose server RPC may
  // not have returned yet — prevents re-fetch from flipping the unread
  // badge back on.
  const pendingReadRef = useRef(new Set());

  const fetchList = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("conversations")
      .select(
        `*,
         listing:listings(id, title),
         buyer:profiles!conversations_buyer_id_fkey(id, full_name, business_name, avatar_url, last_seen_at),
         seller:profiles!conversations_seller_id_fkey(id, full_name, business_name, avatar_url, last_seen_at)`,
      )
      .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
      .order("last_message_at", { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Per-conversation unread counts from the DB.
    const { data: counts } = await supabase.rpc("get_unread_counts");
    const countMap = new Map(
      (counts || []).map((r) => [r.conversation_id, r.unread_count]),
    );

    // Group by the other user; most recent thread wins per person for
    // display fields, but unread counts and read-state are summed/tracked
    // across every thread with that person.
    const byOther = new Map();
    for (const c of data) {
      const otherId = c.buyer_id === currentUserId ? c.seller_id : c.buyer_id;
      const dbCount = countMap.get(c.id) || 0;
      const prior = byOther.get(otherId);
      if (!prior) {
        byOther.set(otherId, { ...c, unread_count: dbCount });
      } else {
        prior.unread_count += dbCount;
      }
    }

    setConversations(
      Array.from(byOther.values())
        .map((c) => {
          const otherId = c.buyer_id === currentUserId ? c.seller_id : c.buyer_id;
          // Override with 0 if we've locally marked this person read but
          // the RPC hasn't committed on the server yet.
          const effectiveCount = pendingReadRef.current.has(otherId) ? 0 : c.unread_count;
          return { ...c, unread_count: effectiveCount, unread: effectiveCount > 0 };
        })
        .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)),
    );
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Live inbox updates via Realtime + 25 s presence poll
  useEffect(() => {
    if (!currentUserId) return;
    const channelName = `inbox:${currentUserId}`;
    const stale = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${channelName}`);
    if (stale) supabase.removeChannel(stale);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `buyer_id=eq.${currentUserId}`,
        },
        () => fetchList(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `seller_id=eq.${currentUserId}`,
        },
        () => fetchList(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchList(),
      )
      .subscribe();

    // Presence dots refresh
    const poll = setInterval(fetchList, 25_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [currentUserId, fetchList]);

  /**
   * Instantly clear the unread badge in the UI and fire the server RPC.
   * Takes the OTHER PERSON's id (not a conversation id) — marks every
   * thread with them read, matching how the inbox groups by person.
   * pendingReadRef ensures a concurrent Realtime re-fetch doesn't flip the
   * badge back before the RPC completes.
   */
  const markReadLocally = useCallback(
    (otherId) => {
      if (!otherId) return;
      pendingReadRef.current.add(otherId);
      setConversations((prev) =>
        prev.map((c) => {
          const cOtherId = c.buyer_id === currentUserId ? c.seller_id : c.buyer_id;
          return cOtherId === otherId ? { ...c, unread: false, unread_count: 0 } : c;
        }),
      );
      supabase
        .rpc("mark_person_read", { p_other_id: otherId })
        .then(() => {
          pendingReadRef.current.delete(otherId);
        });
    },
    [currentUserId],
  );

  return {
    conversations,
    loading,
    refresh: fetchList,
    markReadLocally,
  };
}
