-- =============================================================
-- Migration 023: Add cancel_customer_order RPC function
-- =============================================================

CREATE OR REPLACE FUNCTION public.cancel_customer_order(p_order_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_current_status text;
BEGIN
  SELECT status INTO v_current_status
  FROM public.orders
  WHERE id = p_order_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_current_status != 'received' THEN
    RAISE EXCEPTION 'Cannot cancel: Kitchen has already started preparing your order.';
  END IF;

  UPDATE public.orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_order_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_customer_order(UUID) TO anon, authenticated;
