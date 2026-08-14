-- =============================================================
-- Migration 032: Update Takeaway sentinel table_number from 999/0 to 99
-- =============================================================

-- Update any existing takeaway table records using old sentinel values to 99
UPDATE public.tables
SET table_number = 99
WHERE table_number IN (0, 999)
  AND NOT EXISTS (
    SELECT 1 FROM public.tables WHERE table_number = 99
  );

-- If no row exists yet for 99, ensure it exists
INSERT INTO public.tables (table_number, is_active)
SELECT 99, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.tables WHERE table_number = 99
);
