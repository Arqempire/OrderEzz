-- =============================================================
-- Migration 027: Add is_dismissed column to orders table for cashier queue
-- =============================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT FALSE;
