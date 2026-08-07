-- =============================================================
-- Migration 020: Fix staff_users RLS Policy and is_admin Security Definer
-- =============================================================

-- 1. Ensure is_admin() is SECURITY DEFINER with search_path = public
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 2. Ensure is_staff() is SECURITY DEFINER with search_path = public
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_users
    WHERE id = auth.uid()
  );
END;
$$;

-- 3. Add explicit SELECT policy on staff_users so authenticated users can read their own profile or admins read all
DROP POLICY IF EXISTS "Staff select staff_users_profile" ON public.staff_users;
CREATE POLICY "Staff select staff_users_profile"
  ON public.staff_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- 4. Add explicit UPDATE policy on staff_users for admin or self
DROP POLICY IF EXISTS "Staff update staff_users_profile" ON public.staff_users;
CREATE POLICY "Staff update staff_users_profile"
  ON public.staff_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());
