-- Enable RLS on all tables
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is authenticated staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin staff
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. TABLES POLICIES
-- Anonymous users CANNOT directly query tables table. Access is restricted to RPC function.
-- Staff can perform full CRUD on tables.
CREATE POLICY "Staff full access on tables"
  ON public.tables
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- 2. MENU CATEGORIES POLICIES
-- Anyone can view categories
CREATE POLICY "Public select menu_categories"
  ON public.menu_categories
  FOR SELECT
  TO public
  USING (true);

-- Staff can modify categories
CREATE POLICY "Staff write menu_categories"
  ON public.menu_categories
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- 3. MENU ITEMS POLICIES
-- Anyone can view menu items
CREATE POLICY "Public select menu_items"
  ON public.menu_items
  FOR SELECT
  TO public
  USING (true);

-- Staff can modify menu items
CREATE POLICY "Staff write menu_items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- 4. ORDERS POLICIES
-- Anyone (anon customer) can create an order
CREATE POLICY "Public insert orders"
  ON public.orders
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Anyone can view an order by ID (customer status page queries order by ID)
CREATE POLICY "Public select orders by id"
  ON public.orders
  FOR SELECT
  TO public
  USING (true);

-- Staff can perform full CRUD on orders
CREATE POLICY "Staff full access on orders"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- 5. ORDER ITEMS POLICIES
-- Anyone can insert order items when creating an order
CREATE POLICY "Public insert order_items"
  ON public.order_items
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Anyone can select order items (for customer order status page)
CREATE POLICY "Public select order_items"
  ON public.order_items
  FOR SELECT
  TO public
  USING (true);

-- Staff can perform full CRUD on order items
CREATE POLICY "Staff full access on order_items"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- 6. STAFF USERS POLICIES
-- Staff can read their own profile
CREATE POLICY "Staff select own profile"
  ON public.staff_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- Admin can manage staff users
CREATE POLICY "Admin full access on staff_users"
  ON public.staff_users
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
