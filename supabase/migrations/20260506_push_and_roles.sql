-- ============================================================
-- CampusConnect — Migration: Push Notifications + Admin Role
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. push_subscriptions table ─────────────────────────────────────────────
-- Stores Web Push API subscription objects per user/device.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint  TEXT NOT NULL,
  p256dh    TEXT NOT NULL,
  auth      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Admins can read all (needed for send-push Edge Function)
CREATE POLICY "Admin read all push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ── 2. ads table — add missing columns if they don't exist ──────────────────
-- (Your existing ads table may already have most of these)
ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS cta_label TEXT DEFAULT 'Learn More',
  ADD COLUMN IF NOT EXISTS priority  INTEGER DEFAULT 0;


-- ── 3. admin_set_user_role() RPC ─────────────────────────────────────────────
-- Allows admins to promote/demote users safely via RLS.
-- The AdminPanel calls supabase.from("profiles").update({role}) directly.
-- If your RLS blocks that, use this RPC instead and call:
--   supabase.rpc("admin_set_user_role", { p_user_id: userId, p_role: newRole })
CREATE OR REPLACE FUNCTION admin_set_user_role(p_user_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins may call this
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: caller is not an admin';
  END IF;
  -- Prevent self-demotion
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;
  -- Validate role value
  IF p_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: must be user or admin';
  END IF;
  UPDATE profiles SET role = p_role WHERE id = p_user_id;
  -- Audit
  INSERT INTO admin_audit_logs(admin_id, action, target_type, target_id)
  VALUES (auth.uid(), CASE WHEN p_role = 'admin' THEN 'GRANT_ADMIN' ELSE 'REVOKE_ADMIN' END, 'user', p_user_id::text);
END;
$$;


-- ── 4. Optional: send_push_to_user() helper ──────────────────────────────────
-- Call from Edge Function or Postgres triggers to queue push notifications.
-- This just records the intent; the actual HTTP call is done by send-push EF.
CREATE TABLE IF NOT EXISTS push_queue (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  url         TEXT DEFAULT '/',
  icon        TEXT DEFAULT '/logo.png',
  tag         TEXT DEFAULT 'default',
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage push queue" ON push_queue FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
