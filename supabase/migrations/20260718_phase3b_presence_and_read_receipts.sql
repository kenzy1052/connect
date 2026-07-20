-- ============================================================
-- CampusConnect — Phase 3b Migration
-- Fixes the conversation race condition, adds read receipts + presence
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- PART A — Fix: "duplicate key value violates ... conversations_listing_id_buyer_id_key"
-- ════════════════════════════════════════════════════════════
-- The original client code did a SELECT to check for an existing
-- conversation, then an INSERT if none was found. Between those two
-- calls (e.g. React re-rendering the hook twice, which is normal and
-- expected in development), two INSERTs could race for the same
-- (listing_id, buyer_id) pair, and the second would fail the unique
-- constraint. Making this atomic server-side removes the race entirely
-- — the client no longer does SELECT-then-INSERT at all (see the updated
-- useConversation.js in this delivery).

CREATE OR REPLACE FUNCTION public.find_or_create_conversation(p_listing_id uuid)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_conversation public.conversations;
BEGIN
  INSERT INTO conversations (listing_id, buyer_id)
  VALUES (p_listing_id, auth.uid())
  ON CONFLICT (listing_id, buyer_id) DO NOTHING;

  SELECT * INTO v_conversation
  FROM conversations
  WHERE listing_id = p_listing_id AND buyer_id = auth.uid();

  RETURN v_conversation;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- PART B — Read receipts
-- ════════════════════════════════════════════════════════════
-- Deliberately an RPC rather than a direct client UPDATE + RLS policy —
-- this way there's no UPDATE surface on `messages` at all for regular
-- users, which is simpler to reason about than an UPDATE policy plus a
-- trigger to lock every column except read_at.

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only a participant in this conversation can mark it read.
  IF NOT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = p_conversation_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  ) THEN
    RETURN;
  END IF;

  UPDATE messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id <> auth.uid()
    AND read_at IS NULL;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- PART C — Online / last-seen presence
-- ════════════════════════════════════════════════════════════
-- Simple heartbeat-based presence (the app pings this every ~45s while
-- open) rather than Supabase Realtime Presence channels — easier to
-- reason about, works app-wide (not just inside the chat screen), and
-- is enough to show "Online" / "Last seen 12m ago" like WhatsApp.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

-- ════════════════════════════════════════════════════════════
-- PART D — Inbox preview: last message snippet on the conversation itself
-- ════════════════════════════════════════════════════════════
-- Avoids an extra query per conversation just to show "last message" text
-- in the Messages list — the trigger that already bumps last_message_at
-- (from Phase 3) now also stores a short preview.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_body text,
  ADD COLUMN IF NOT EXISTS last_message_sender_id uuid;

CREATE OR REPLACE FUNCTION public.notify_new_message_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient_id uuid;
  v_sender_name text;
  v_listing_title text;
  v_conversation RECORD;
  v_has_token boolean;
  v_wants_push boolean;
BEGIN
  SELECT * INTO v_conversation FROM conversations WHERE id = NEW.conversation_id;

  UPDATE conversations
  SET last_message_at = now(),
      last_message_body = left(NEW.body, 120),
      last_message_sender_id = NEW.sender_id
  WHERE id = NEW.conversation_id;

  v_recipient_id := CASE
    WHEN NEW.sender_id = v_conversation.buyer_id THEN v_conversation.seller_id
    ELSE v_conversation.buyer_id
  END;

  SELECT COALESCE(full_name, business_name, 'Someone') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  SELECT title INTO v_listing_title FROM listings WHERE id = v_conversation.listing_id;

  SELECT
    EXISTS (SELECT 1 FROM push_subscriptions WHERE user_id = v_recipient_id AND fcm_token IS NOT NULL),
    COALESCE((SELECT push_messages FROM notification_preferences WHERE user_id = v_recipient_id), true)
  INTO v_has_token, v_wants_push;

  IF v_has_token AND v_wants_push THEN
    INSERT INTO push_queue (user_id, title, body, url, icon, tag)
    VALUES (
      v_recipient_id,
      'New message from ' || v_sender_name,
      left(NEW.body, 90) || ' — ' || COALESCE(left(v_listing_title, 40), 'your listing'),
      '/listings/' || v_conversation.listing_id::text || '?conversation=' || NEW.conversation_id::text,
      '/icon-192.png',
      'new-message'
    );
  END IF;

  RETURN NEW;
END;
$$;
-- (trigger itself already exists from Phase 3 — same function, no need to
-- re-create the trigger, CREATE OR REPLACE FUNCTION is enough)

COMMIT;

-- ── Verification queries — run after ────────────────────────────────────
-- SELECT public.find_or_create_conversation('<some-listing-id>');  -- run twice, should not error the 2nd time
-- SELECT last_seen_at FROM profiles LIMIT 3;
