-- Add full_name and must_change_password columns to staff_users table
ALTER TABLE public.staff_users
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true;

-- Update RLS policies for staff_users table
DROP POLICY IF EXISTS "Staff select own profile" ON public.staff_users;
DROP POLICY IF EXISTS "Admin full access on staff_users" ON public.staff_users;
DROP POLICY IF EXISTS "Public select staff_users" ON public.staff_users;

-- Public/Staff select on staff_users table so staff list can be fetched directly from Supabase
CREATE POLICY "Public select staff_users"
  ON public.staff_users
  FOR SELECT
  TO public
  USING (true);

-- Staff can update their own profile (e.g. setting must_change_password = false)
CREATE POLICY "Staff update own profile"
  ON public.staff_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Admin full access on staff_users
CREATE POLICY "Admin full access on staff_users"
  ON public.staff_users
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
