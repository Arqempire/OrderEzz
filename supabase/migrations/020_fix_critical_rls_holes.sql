-- =============================================================
-- CRITICAL SECURITY FIX
-- 1. Closes privilege-escalation hole in staff_users UPDATE policy
-- 2. Closes public full-table read on orders / order_items
-- 3. Adds a scoped RPC for customers to fetch their own order status
-- =============================================================

-- ---------------------------------------------------------------
-- 1. staff_users: remove the "public, USING (true)" UPDATE policy.
--    Anyone with the anon key could previously set role = 'admin'
--    on any row. Replace with an owner-only, column-safe policy
--    and keep using the existing SECURITY DEFINER RPC for the
--    one legitimate self-service case (must_change_password).
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to update their own staff profile" ON public.staff_users;

CREATE POLICY "Staff update own profile (self only)"
  ON public.staff_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.staff_users WHERE id = auth.uid()));
  -- WITH CHECK re-reads the existing role so a self-update can never change `role`,
  -- even if a future client bug tries to send it. All password/flag changes should
  -- go through update_staff_must_change_password() as before.


-- ---------------------------------------------------------------
-- 2. orders / order_items: remove blanket public SELECT.
--    "Public select orders by id" was USING (true) with no id
--    filter, so any anon request could dump the entire table.
--    Direct table select is now staff-only; customers fetch their
--    own order via the scoped RPC below.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Public select orders by id" ON public.orders;
DROP POLICY IF EXISTS "Public select order_items" ON public.order_items;

-- (Staff full-access policies from 002_rls_policies.sql are untouched
--  and still cover staff/admin SELECT.)


-- ---------------------------------------------------------------
-- 3. Scoped RPC: returns exactly one order + its items, by ID only.
--    Safe for anon customers tracking their own order status page,
--    since it never allows listing or filtering across orders.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_order_status(p_order_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', o.id,
    'status', o.status,
    'total_amount', o.total_amount,
    'created_at', o.created_at,
    'table_number', t.table_number,
    'items', (
      SELECT json_agg(json_build_object(
        'id', oi.id,
        'quantity', oi.quantity,
        'notes', oi.notes,
        'price_at_order', oi.price_at_order,
        'name', mi.name,
        'image_url', mi.image_url
      ))
      FROM public.order_items oi
      JOIN public.menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = o.id
    )
  ) INTO v_result
  FROM public.orders o
  JOIN public.tables t ON t.id = o.table_id
  WHERE o.id = p_order_id;

  RETURN v_result; -- NULL if no matching order (no info leaked either way)
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_status(UUID) TO anon, authenticated;
