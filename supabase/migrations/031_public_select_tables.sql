-- =============================================================
-- Migration 031: Allow anonymous public SELECT on tables
-- Required so that:
-- 1. get_order_status RPC can LEFT JOIN tables and return table_number
-- 2. Customer-facing order status tracking shows correct table numbers
-- 3. Active order banner correctly resolves table info for QR-scanned orders
-- =============================================================

-- Allow public read access on tables so table_number is visible
-- to anonymous customers on the order status tracking page.
-- The qr_token column is already public (used for QR scanning).
-- This does NOT expose any write capability.
DROP POLICY IF EXISTS "Public select tables" ON public.tables;
CREATE POLICY "Public select tables"
  ON public.tables
  FOR SELECT
  TO public
  USING (true);
