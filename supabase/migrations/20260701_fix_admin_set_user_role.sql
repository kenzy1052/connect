-- ============================================================
-- CampusConnect — Fix: admin_set_user_role() role-type mismatch
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================
--
-- THE BUG:
--   profiles.role is a Postgres ENUM (public.user_role: 'student' | 'admin'),
--   but admin_set_user_role() was doing:
--       UPDATE profiles SET role = p_role WHERE id = p_user_id;
--   where p_role is a plain TEXT parameter. Postgres does not
--   implicitly cast TEXT -> a custom ENUM type, so every call failed with:
--       "column "role" is of type user_role but expression is of type text"
--   which the client saw as a 400 Bad Request from the RPC endpoint.
--
-- THE FIX:
--   Cast p_role to public.user_role explicitly before the UPDATE.
--   Everything else (admin check, self-demotion guard, audit log) is
--   unchanged from your existing deployed function.

CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public._require_admin();

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  IF p_role NOT IN ('student', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  -- FIX: cast text -> public.user_role enum
  UPDATE public.profiles
  SET role = p_role::public.user_role
  WHERE id = p_user_id;

  INSERT INTO public.admin_audit_logs(admin_id, action, target_type, target_id)
  VALUES (
    auth.uid(),
    CASE WHEN p_role = 'admin' THEN 'GRANT_ADMIN' ELSE 'REVOKE_ADMIN' END,
    'user',
    p_user_id
  );
END;
$$;
