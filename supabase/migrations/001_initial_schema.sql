-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums
CREATE TYPE order_status AS ENUM (
  'received',
  'preparing',
  'ready',
  'served',
  'paid',
  'cancelled'
);

CREATE TYPE staff_role AS ENUM (
  'kitchen',
  'admin'
);

-- 1. Tables Table
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INT UNIQUE NOT NULL,
  qr_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Menu Categories Table
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Menu Items Table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'received',
  total NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  notes TEXT,
  price_at_order NUMERIC(10,2) NOT NULL CHECK (price_at_order >= 0)
);

-- 6. Staff Users Table (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.staff_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role staff_role NOT NULL DEFAULT 'kitchen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tables_qr_token ON public.tables(qr_token);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- Auto-update updated_at timestamp trigger for orders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
