-- ============================================================
-- CampusConnect — 2026-07-20 Migration
-- Fixes: person-scoped unread marking, working Clear Chat /
-- Delete Conversation, Block User (with enforcement), and grants
-- needed by the new client code shipped alongside this migration.
--
-- NOTE ON PRESENCE: touch_last_seen() itself is unchanged (it was
-- already correct) — the client now updates `profiles.last_seen_at`
-- directly instead of going through this RPC, since every profile in
-- the last DB export had last_seen_at = NULL, meaning the RPC path
-- was silently failing (most likely PostgREST's schema cache not
-- having picked up the function). Direct table updates use the
-- existing profiles_update_self RLS policy, so they don't depend on
-- RPC exposure at all. Run this migration, then in the Supabase
-- dashboard do Database → API → "Reload schema" (or just redeploy)
-- so any RPC-based calls still in flight pick up cleanly.
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- PART A — blocked_users table
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocked_users_no_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT blocked_users_unique UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Either side of a block can see the row exists — the blocked person
-- needs this too, so their client can show "You can't message this
-- person" instead of a confusing failed-insert error.
DROP POLICY IF EXISTS blocked_users_select_own ON public.blocked_users;
CREATE POLICY blocked_users_select_own ON public.blocked_users
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

DROP POLICY IF EXISTS blocked_users_insert_own ON public.blocked_users;
CREATE POLICY blocked_users_insert_own ON public.blocked_users
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS blocked_users_delete_own ON public.blocked_users;
CREATE POLICY blocked_users_delete_own ON public.blocked_users
  FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- ════════════════════════════════════════════════════════════
-- PART B — Enforce blocks: a blocked sender can no longer insert
-- messages into a conversation with the person who blocked them.
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS messages_insert_participant ON public.messages;
CREATE POLICY messages_insert_participant ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND c.status = 'active'
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.conversations c2
      JOIN public.blocked_users bu
        ON bu.blocker_id = CASE WHEN c2.buyer_id = auth.uid() THEN c2.seller_id ELSE c2.buyer_id END
       AND bu.blocked_id = auth.uid()
      WHERE c2.id = messages.conversation_id
    )
  );

-- ════════════════════════════════════════════════════════════
-- PART C — Person-scoped read marking
-- ════════════════════════════════════════════════════════════
-- Old mark_conversation_read only touched one conversation row. If
-- two people had more than one conversation between them (e.g. an
-- older one closed after a listing sold, then a new one opened for a
-- different listing), unread messages sitting in the thread that
-- *wasn't* the one you opened were never marked read — so the badge
-- kept coming back after refresh. This marks every thread with that
-- person at once.

CREATE OR REPLACE FUNCTION public.mark_person_read(p_other_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE messages m
  SET read_at = now()
  FROM conversations c
  WHERE m.conversation_id = c.id
    AND m.sender_id = p_other_id
    AND m.read_at IS NULL
    AND (
      (c.buyer_id = auth.uid() AND c.seller_id = p_other_id)
      OR (c.seller_id = auth.uid() AND c.buyer_id = p_other_id)
    );
END;
$$;

-- ════════════════════════════════════════════════════════════
-- PART D — Clear Chat / Delete Conversation
-- ════════════════════════════════════════════════════════════
-- Neither messages nor conversations has an UPDATE/DELETE policy for
-- regular participants (only admins). The existing client code calls
-- .delete() directly today, which RLS silently turns into a 0-row
-- no-op — Clear Chat and Delete Conversation have never actually
-- deleted anything. Using SECURITY DEFINER RPCs here (same pattern as
-- mark_conversation_read before it) keeps that "no direct
-- write/delete surface on messages" property intact instead of
-- opening broad policies.
--
-- Both operate per-PERSON (across every conversation thread with that
-- person), matching the inbox, which is grouped by person rather than
-- by individual conversation row.

CREATE OR REPLACE FUNCTION public.clear_person_chat(p_other_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  FOR v_conv_id IN
    SELECT id FROM conversations c
    WHERE (c.buyer_id = auth.uid() AND c.seller_id = p_other_id)
       OR (c.seller_id = auth.uid() AND c.buyer_id = p_other_id)
  LOOP
    DELETE FROM messages WHERE conversation_id = v_conv_id;
    UPDATE conversations
    SET last_message_body = NULL,
        last_message_sender_id = NULL,
        last_message_at = created_at
    WHERE id = v_conv_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_person_conversation(p_other_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM messages
  WHERE conversation_id IN (
    SELECT id FROM conversations c
    WHERE (c.buyer_id = auth.uid() AND c.seller_id = p_other_id)
       OR (c.seller_id = auth.uid() AND c.buyer_id = p_other_id)
  );

  DELETE FROM conversations
  WHERE (buyer_id = auth.uid() AND seller_id = p_other_id)
     OR (seller_id = auth.uid() AND buyer_id = p_other_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_person_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_person_chat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_person_conversation(uuid) TO authenticated;

COMMIT;

-- Make sure PostgREST picks up the new/changed functions and the new
-- table immediately rather than waiting for its next auto-refresh.
NOTIFY pgrst, 'reload schema';

-- ── Verification queries — run after ────────────────────────────────────
-- select last_seen_at from profiles where id = auth.uid(); -- after using the app, should be recent
-- select * from blocked_users limit 5;
-- select public.mark_person_read('<some-user-id>');
