-- Create Import Batch Status Enum
CREATE TYPE import_batch_status AS ENUM (
  'pending_review',
  'confirmed',
  'discarded'
);

-- 1. Menu Import Batches Table
CREATE TABLE IF NOT EXISTS public.menu_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_image_url TEXT,
  status import_batch_status NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Menu Import Items (Staging Table)
CREATE TABLE IF NOT EXISTS public.menu_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.menu_import_batches(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  confidence_flag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_import_items_batch ON public.menu_import_items(batch_id);

-- RLS Security Policies
ALTER TABLE public.menu_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_import_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff access on menu_import_batches"
  ON public.menu_import_batches
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "Public insert menu_import_batches"
  ON public.menu_import_batches
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public select menu_import_batches"
  ON public.menu_import_batches
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Staff access on menu_import_items"
  ON public.menu_import_items
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "Public insert menu_import_items"
  ON public.menu_import_items
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public select menu_import_items"
  ON public.menu_import_items
  FOR SELECT
  TO public
  USING (true);

-- RPC Function to confirm batch and migrate items to live menu
CREATE OR REPLACE FUNCTION public.confirm_menu_import_batch(
  p_batch_id UUID,
  p_items JSONB
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_item RECORD;
  v_category_id UUID;
  v_sort_order INT := 0;
BEGIN
  -- Verify batch exists and is pending_review
  IF NOT EXISTS (SELECT 1 FROM public.menu_import_batches WHERE id = p_batch_id AND status = 'pending_review') THEN
    RAISE EXCEPTION 'Batch % not found or already processed.', p_batch_id;
  END IF;

  -- Iterate through items in JSON payload
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    category_name TEXT,
    item_name TEXT,
    description TEXT,
    price NUMERIC(10,2)
  )
  LOOP
    -- Find or create menu category
    SELECT id INTO v_category_id
    FROM public.menu_categories
    WHERE LOWER(name) = LOWER(v_item.category_name);

    IF v_category_id IS NULL THEN
      SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order FROM public.menu_categories;
      INSERT INTO public.menu_categories (name, sort_order)
      VALUES (v_item.category_name, v_sort_order)
      RETURNING id INTO v_category_id;
    END IF;

    -- Insert into live menu_items
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order FROM public.menu_items WHERE category_id = v_category_id;

    INSERT INTO public.menu_items (category_id, name, description, price, is_available, sort_order)
    VALUES (v_category_id, v_item.item_name, v_item.description, v_item.price, true, v_sort_order);
  END LOOP;

  -- Update batch status to confirmed
  UPDATE public.menu_import_batches
  SET status = 'confirmed'
  WHERE id = p_batch_id;

  RETURN true;
END;
$$;
