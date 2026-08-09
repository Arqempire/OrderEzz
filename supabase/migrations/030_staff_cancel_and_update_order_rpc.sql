-- =============================================================
-- Migration 030: Add update_order_status RPC for staff order management
-- =============================================================

CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status order_status,
  p_cancelled_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_rows_updated INT;
BEGIN
  IF p_new_status = 'cancelled' THEN
    UPDATE public.orders
    SET status = 'cancelled',
        cancelled_by = COALESCE(p_cancelled_by, 'staff'),
        updated_at = now()
    WHERE id = p_order_id;
  ELSE
    UPDATE public.orders
    SET status = p_new_status,
        updated_at = now()
    WHERE id = p_order_id;
  END IF;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  RETURN v_rows_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, order_status, TEXT) TO anon, authenticated;
