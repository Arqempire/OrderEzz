-- 1. Function to resolve table ID from QR token securely
CREATE OR REPLACE FUNCTION public.resolve_table_from_qr_token(p_qr_token UUID)
RETURNS TABLE (
  table_id UUID,
  is_active BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT t.id AS table_id, t.is_active
  FROM public.tables t
  WHERE t.qr_token = p_qr_token;
END;
$$;


-- 2. Function to regenerate table QR token (Staff/Admin only)
CREATE OR REPLACE FUNCTION public.regenerate_qr_token(p_table_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_new_token UUID := gen_random_uuid();
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only staff members can regenerate QR tokens.';
  END IF;

  UPDATE public.tables
  SET qr_token = v_new_token
  WHERE id = p_table_id;

  RETURN v_new_token;
END;
$$;


-- 3. Function to place order with server-side price validation
CREATE OR REPLACE FUNCTION public.place_order_with_items(
  p_table_id UUID,
  p_items JSONB
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC(10,2) := 0.00;
  v_item RECORD;
  v_menu_price NUMERIC(10,2);
  v_is_available BOOLEAN;
  v_table_active BOOLEAN;
BEGIN
  -- Verify table is active
  SELECT is_active INTO v_table_active
  FROM public.tables
  WHERE id = p_table_id;

  IF v_table_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Table is inactive or does not exist.';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart cannot be empty.';
  END IF;

  -- Create order record first with 0 total
  INSERT INTO public.orders (table_id, status, total)
  VALUES (p_table_id, 'received', 0.00)
  RETURNING id INTO v_order_id;

  -- Iterate through items, validate availability and calculate total
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id UUID, quantity INT, notes TEXT)
  LOOP
    SELECT price, is_available INTO v_menu_price, v_is_available
    FROM public.menu_items
    WHERE id = v_item.menu_item_id;

    IF v_menu_price IS NULL THEN
      RAISE EXCEPTION 'Menu item % not found.', v_item.menu_item_id;
    END IF;

    IF v_is_available IS NOT TRUE THEN
      RAISE EXCEPTION 'Menu item is currently unavailable.';
    END IF;

    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid item quantity %.', v_item.quantity;
    END IF;

    -- Insert order item with price snapshot
    INSERT INTO public.order_items (order_id, menu_item_id, quantity, notes, price_at_order)
    VALUES (v_order_id, v_item.menu_item_id, v_item.quantity, v_item.notes, v_menu_price);

    -- Accumulate total
    v_total := v_total + (v_menu_price * v_item.quantity);
  END LOOP;

  -- Update order total
  UPDATE public.orders
  SET total = v_total
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;
