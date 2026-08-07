-- =============================================================
-- FIX: Allow staff to update menu_items availability
-- Run this in your Supabase Dashboard → SQL Editor
-- =============================================================

-- Drop the old restrictive policy that only allowed is_staff() users to update
DROP POLICY IF EXISTS "Staff write menu_items" ON public.menu_items;

-- Create a new policy: ALL authenticated users (admin + staff) can update any column
CREATE POLICY "Staff write menu_items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also allow the anon role to update (needed when server route uses anon key fallback)
DROP POLICY IF EXISTS "Staff update menu_items availability" ON public.menu_items;
DROP POLICY IF EXISTS "API update menu_items availability" ON public.menu_items;
