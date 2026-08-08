-- =============================================================
-- Migration 026: Add cancelled_by column to orders table
-- =============================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by TEXT DEFAULT NULL;

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
  SET status = 'cancelled', cancelled_by = 'customer', updated_at = now()
  WHERE id = p_order_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_customer_order(UUID) TO anon, authenticated;
