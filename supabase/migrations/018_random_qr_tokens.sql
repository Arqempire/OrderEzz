-- =============================================================
-- Migration 018: Cryptographic Random QR Token Generation & Rotation
-- =============================================================

-- 1. Ensure pgcrypto extension is enabled for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enforce database-level default gen_random_uuid() for qr_token column
ALTER TABLE public.tables ALTER COLUMN qr_token SET DEFAULT gen_random_uuid();

-- 3. Regenerate qr_token for all existing seeded/configured tables to invalidate predictable tokens
UPDATE public.tables SET qr_token = gen_random_uuid();
