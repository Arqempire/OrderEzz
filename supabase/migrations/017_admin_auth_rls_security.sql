-- =============================================================
-- Migration 017: Admin Authorization, RLS Audit & RPC Hardening
-- =============================================================

-- 1. HARDEN ANALYTICS RPC FUNCTIONS WITH ADMIN ROLE CHECKS

-- get_analytics_summary
CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  p_start_date TIMESTAMPTZ DEFAULT '1970-01-01'::TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  total_revenue NUMERIC(10,2),
  total_orders BIGINT,
  average_order_value NUMERIC(10,2),
  avg_fulfillment_time_mins NUMERIC(10,2)
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required.';
  END IF;

  RETURN QUERY
  WITH order_stats AS (
    SELECT 
      COALESCE(SUM(o.total), 0.00) AS rev,
      COUNT(o.id) AS cnt,
      COALESCE(AVG(o.total), 0.00) AS aov
    FROM public.orders o
    WHERE o.created_at >= p_start_date AND o.created_at <= p_end_date
      AND o.status != 'cancelled'
  ),
  fulfillment_stats AS (
    SELECT 
      AVG(EXTRACT(EPOCH FROM (h_served.changed_at - h_received.changed_at)) / 60.0) AS avg_mins
    FROM public.order_status_history h_received
    JOIN public.order_status_history h_served 
      ON h_received.order_id = h_served.order_id 
     AND h_received.status = 'received' 
     AND h_served.status = 'served'
    JOIN public.orders o ON o.id = h_received.order_id
    WHERE o.created_at >= p_start_date AND o.created_at <= p_end_date
  )
  SELECT 
    os.rev AS total_revenue,
    os.cnt AS total_orders,
    ROUND(os.aov, 2) AS average_order_value,
    ROUND(COALESCE(fs.avg_mins, 0.00)::numeric, 2) AS avg_fulfillment_time_mins
  FROM order_stats os, fulfillment_stats fs;
END;
$$;

-- get_top_selling_items
CREATE OR REPLACE FUNCTION public.get_top_selling_items(
  p_start_date TIMESTAMPTZ DEFAULT '1970-01-01'::TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ DEFAULT now(),
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  category_name TEXT,
  total_quantity BIGINT,
  total_revenue NUMERIC(10,2)
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    mi.id AS item_id,
    mi.name AS item_name,
    COALESCE(mc.name, 'Uncategorized') AS category_name,
    SUM(oi.quantity)::BIGINT AS total_quantity,
    SUM(oi.quantity * oi.price_at_order)::NUMERIC(10,2) AS total_revenue
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.menu_items mi ON mi.id = oi.menu_item_id
  LEFT JOIN public.menu_categories mc ON mc.id = mi.category_id
  WHERE o.created_at >= p_start_date AND o.created_at <= p_end_date
    AND o.status != 'cancelled'
  GROUP BY mi.id, mi.name, mc.name
  ORDER BY total_quantity DESC, total_revenue DESC
  LIMIT p_limit;
END;
$$;

-- get_slow_moving_items
CREATE OR REPLACE FUNCTION public.get_slow_moving_items(
  p_start_date TIMESTAMPTZ DEFAULT '1970-01-01'::TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  category_name TEXT,
  total_quantity BIGINT,
  total_revenue NUMERIC(10,2)
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    mi.id AS item_id,
    mi.name AS item_name,
    COALESCE(mc.name, 'Uncategorized') AS category_name,
    COALESCE(SUM(oi.quantity), 0)::BIGINT AS total_quantity,
    COALESCE(SUM(oi.quantity * oi.price_at_order), 0.00)::NUMERIC(10,2) AS total_revenue
  FROM public.menu_items mi
  LEFT JOIN public.menu_categories mc ON mc.id = mi.category_id
  LEFT JOIN public.order_items oi ON oi.menu_item_id = mi.id
  LEFT JOIN public.orders o ON o.id = oi.order_id AND o.created_at >= p_start_date AND o.created_at <= p_end_date AND o.status != 'cancelled'
  GROUP BY mi.id, mi.name, mc.name
  HAVING COALESCE(SUM(oi.quantity), 0) <= 2
  ORDER BY total_quantity ASC, mi.name ASC;
END;
$$;

-- get_category_revenue
CREATE OR REPLACE FUNCTION public.get_category_revenue(
  p_start_date TIMESTAMPTZ DEFAULT '1970-01-01'::TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  category_name TEXT,
  total_revenue NUMERIC(10,2),
  total_items_sold BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(mc.name, 'Uncategorized') AS category_name,
    SUM(oi.quantity * oi.price_at_order)::NUMERIC(10,2) AS total_revenue,
    SUM(oi.quantity)::BIGINT AS total_items_sold
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.menu_items mi ON mi.id = oi.menu_item_id
  LEFT JOIN public.menu_categories mc ON mc.id = mi.category_id
  WHERE o.created_at >= p_start_date AND o.created_at <= p_end_date
    AND o.status != 'cancelled'
  GROUP BY mc.name
  ORDER BY total_revenue DESC;
END;
$$;

-- get_hourly_order_volume
CREATE OR REPLACE FUNCTION public.get_hourly_order_volume(
  p_start_date TIMESTAMPTZ DEFAULT '1970-01-01'::TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  hour_of_day INT,
  order_count BIGINT,
  revenue NUMERIC(10,2)
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM o.created_at)::INT AS hour_of_day,
    COUNT(o.id)::BIGINT AS order_count,
    SUM(o.total)::NUMERIC(10,2) AS revenue
  FROM public.orders o
  WHERE o.created_at >= p_start_date AND o.created_at <= p_end_date
    AND o.status != 'cancelled'
  GROUP BY EXTRACT(HOUR FROM o.created_at)
  ORDER BY hour_of_day ASC;
END;
$$;

-- get_table_utilization
CREATE OR REPLACE FUNCTION public.get_table_utilization(
  p_start_date TIMESTAMPTZ DEFAULT '1970-01-01'::TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  table_number INT,
  order_count BIGINT,
  total_revenue NUMERIC(10,2)
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    t.table_number,
    COUNT(o.id)::BIGINT AS order_count,
    COALESCE(SUM(o.total), 0.00)::NUMERIC(10,2) AS total_revenue
  FROM public.tables t
  LEFT JOIN public.orders o ON o.table_id = t.id AND o.created_at >= p_start_date AND o.created_at <= p_end_date AND o.status != 'cancelled'
  GROUP BY t.table_number
  ORDER BY t.table_number ASC;
END;
$$;

-- Revoke public permissions on analytics RPCs
REVOKE EXECUTE ON FUNCTION public.get_analytics_summary(TIMESTAMPTZ, TIMESTAMPTZ) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_top_selling_items(TIMESTAMPTZ, TIMESTAMPTZ, INT) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_slow_moving_items(TIMESTAMPTZ, TIMESTAMPTZ) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_category_revenue(TIMESTAMPTZ, TIMESTAMPTZ) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_hourly_order_volume(TIMESTAMPTZ, TIMESTAMPTZ) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_table_utilization(TIMESTAMPTZ, TIMESTAMPTZ) FROM public, anon;


-- 2. AUDIT & HARDEN TABLE RLS POLICIES (AUTO-CREATES TABLES IF MISSING)

-- Ensure order_status_history table exists
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Ensure customer_feedbacks table exists
CREATE TABLE IF NOT EXISTS public.customer_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  table_number INT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[] DEFAULT '{}',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_feedbacks ENABLE ROW LEVEL SECURITY;

-- Ensure menu_import_batches table exists
CREATE TABLE IF NOT EXISTS public.menu_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_import_batches ENABLE ROW LEVEL SECURITY;

-- Ensure menu_import_items table exists
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
ALTER TABLE public.menu_import_items ENABLE ROW LEVEL SECURITY;


-- APPLY SECURE RLS POLICIES

-- menu_import_batches
DROP POLICY IF EXISTS "Public insert menu_import_batches" ON public.menu_import_batches;
DROP POLICY IF EXISTS "Public select menu_import_batches" ON public.menu_import_batches;
DROP POLICY IF EXISTS "Staff access on menu_import_batches" ON public.menu_import_batches;

CREATE POLICY "Admin access on menu_import_batches"
  ON public.menu_import_batches
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- menu_import_items
DROP POLICY IF EXISTS "Public insert menu_import_items" ON public.menu_import_items;
DROP POLICY IF EXISTS "Public select menu_import_items" ON public.menu_import_items;
DROP POLICY IF EXISTS "Staff access on menu_import_items" ON public.menu_import_items;

CREATE POLICY "Admin access on menu_import_items"
  ON public.menu_import_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- customer_feedbacks
DROP POLICY IF EXISTS "Public select customer_feedbacks" ON public.customer_feedbacks;

CREATE POLICY "Staff select customer_feedbacks"
  ON public.customer_feedbacks
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- order_status_history
DROP POLICY IF EXISTS "Public select order_status_history" ON public.order_status_history;

CREATE POLICY "Staff select order_status_history"
  ON public.order_status_history
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- staff_users
DROP POLICY IF EXISTS "Public select staff_users" ON public.staff_users;
