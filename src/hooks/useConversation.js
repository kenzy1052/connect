import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Manages a single listing-scoped conversation: finds-or-creates it,
 * loads message history, sends new messages, and subscribes to Realtime
 * so both participants see new messages instantly without refreshing.
 *
 * seller_id is never sent by the client — it's derived server-side by the
 * `trg_set_conversation_seller` trigger from the listing itself.
 */
export function useConversation({
  listingId,
  currentUserId,
  conversationId = null,
  enabled = true,
}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const loadOrCreateConversation = useCallback(async () => {
    if (!currentUserId || !enabled) return;
    if (!conversationId && !listingId) return;
    setLoading(true);
    setError(null);

    let convo = null;

    if (conversationId) {
      // Known conversation (e.g. opened from the inbox — works for both
      // the buyer and the seller side, since we're not assuming who's
      // opening it).
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
    } else {
      // Buyer entry point (e.g. "Message Seller" on a listing) — find or
      // create the conversation for this (listing, buyer) pair. Only ever
      // used by the buyer side; a seller opening their own listing's
      // conversations always goes through the conversationId path above,
      // via the inbox, since they don't have a single "buyer_id = me" row.
      const { data: existing, error: findErr } = await supabase
        .from("conversations")
        .select("*")
        .eq("listing_id", listingId)
        .eq("buyer_id", currentUserId)
        .maybeSingle();

      if (findErr) {
        setError(findErr.message);
        setLoading(false);
        return;
      }

      convo = existing;
      if (!convo) {
        const { data: created, error: createErr } = await supabase
          .from("conversations")
          .insert([{ listing_id: listingId, buyer_id: currentUserId }])
          .select()
          .single();
        if (createErr) {
          setError(createErr.message);
          setLoading(false);
          return;
        }
        convo = created;
      }
    }

    setConversation(convo);

    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true });

    if (msgErr) setError(msgErr.message);
    setMessages(msgs || []);
    setLoading(false);
  }, [listingId, currentUserId, conversationId, enabled]);

  useEffect(() => {
    loadOrCreateConversation();
  }, [loadOrCreateConversation]);

  // ── Realtime subscription (StrictMode-safe channel eviction, same
  // pattern used by NotificationBell.jsx / useDiscoveryFeed.js) ──────────
  useEffect(() => {
    if (!conversation?.id) return;

    const CHANNEL_NAME = `conversation:${conversation.id}`;
    const stale = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${CHANNEL_NAME}`);
    if (stale) supabase.removeChannel(stale);

    const channel = supabase
      .channel(CHANNEL_NAME)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  const sendMessage = useCallback(
    async (body) => {
      const trimmed = body.trim();
      if (!trimmed || !conversation?.id || !currentUserId) return { error: "Empty message" };
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
      // Optimistic local append — the Realtime event will also arrive but
      // is de-duped by id in the handler above.
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data],
      );
      return { data };
    },
    [conversation?.id, currentUserId],
  );

  return {
    conversation,
    messages,
    loading,
    sending,
    error,
    sendMessage,
    isClosed: conversation?.status === "closed",
  };
}

/**
 * Lists every conversation the current user is part of (as buyer OR
 * seller), for the Messages inbox tab. Enriches each row with the listing
 * title/cover image and the other participant's name so the inbox can
 * render without N+1 queries in the component itself.
 */
export function useConversationsList(currentUserId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `*,
         listing:listings(id, title),
         buyer:profiles!conversations_buyer_id_fkey(id, full_name, business_name, avatar_url),
         seller:profiles!conversations_seller_id_fkey(id, full_name, business_name, avatar_url)`,
      )
      .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
      .order("last_message_at", { ascending: false });

    if (!error && data) setConversations(data);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { conversations, loading, refresh: fetchList };
}
