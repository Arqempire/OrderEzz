-- =============================================================
-- Migration 033: Fix get_order_status RPC to explicitly bypass RLS
-- and ensure table_number is always returned for QR-scanned table orders
-- =============================================================

-- Re-create the RPC with SET row_security = off so the LEFT JOIN on tables
-- always succeeds regardless of the tables RLS policy for anonymous users.
CREATE OR REPLACE FUNCTION public.get_order_status(p_order_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
SET row_security = off
LANGUAGE plpgsql AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', o.id,
    'table_id', o.table_id,
    'status', o.status,
    'total', o.total,
    'cancelled_by', o.cancelled_by,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'table', CASE
      WHEN t.id IS NOT NULL THEN json_build_object(
        'id', t.id,
        'table_number', t.table_number,
        'qr_token', t.qr_token,
        'is_active', t.is_active
      )
      ELSE NULL
    END,
    'order_items', COALESCE((
      SELECT json_agg(json_build_object(
        'id', oi.id,
        'order_id', oi.order_id,
        'menu_item_id', oi.menu_item_id,
        'quantity', oi.quantity,
        'notes', oi.notes,
        'price_at_order', oi.price_at_order,
        'menu_item', json_build_object(
          'id', mi.id,
          'name', mi.name,
          'description', mi.description,
          'price', mi.price,
          'image_url', mi.image_url,
          'is_available', mi.is_available
        )
      ))
      FROM public.order_items oi
      LEFT JOIN public.menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = o.id
    ), '[]'::json)
  ) INTO v_result
  FROM public.orders o
  LEFT JOIN public.tables t ON t.id = o.table_id
  WHERE o.id = p_order_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_status(UUID) TO anon, authenticated;
