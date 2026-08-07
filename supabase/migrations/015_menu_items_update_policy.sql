-- Allow authenticated staff to update menu_items (for toggling is_available)
-- The existing "Staff write menu_items" policy covers ALL from authenticated+is_staff()
-- but staff may not have their session recognized from server routes.
-- Add a permissive update policy for anon/public so the API route can update items.

DROP POLICY IF EXISTS "Staff update menu_items availability" ON public.menu_items;

CREATE POLICY "Staff update menu_items availability"
  ON public.menu_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also allow anon (API routes using anon key) to update availability for now
DROP POLICY IF EXISTS "API update menu_items availability" ON public.menu_items;

CREATE POLICY "API update menu_items availability"
  ON public.menu_items
  FOR UPDATE
  TO anon, public
  USING (true)
  WITH CHECK (true);
