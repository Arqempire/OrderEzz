-- =============================================================
-- Migration 019: Table Quick Requests ('Call Waiter' & 'Request Water')
-- =============================================================

-- 1. Create Enums for Request Type and Request Status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_type') THEN
    CREATE TYPE request_type AS ENUM ('waiter', 'water');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE request_status AS ENUM ('pending', 'acknowledged', 'resolved');
  END IF;
END $$;

-- 2. Create public.table_requests Table
CREATE TABLE IF NOT EXISTS public.table_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  type request_type NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 3. Indexes for fast query lookup & sorting
CREATE INDEX IF NOT EXISTS idx_table_requests_status_created ON public.table_requests(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_table_requests_table ON public.table_requests(table_id);

-- 4. Enable RLS Security Policies
ALTER TABLE public.table_requests ENABLE ROW LEVEL SECURITY;

-- Anonymous customers can insert requests
DROP POLICY IF EXISTS "Public insert table_requests" ON public.table_requests;
CREATE POLICY "Public insert table_requests"
  ON public.table_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Anonymous select so customers can check request status
DROP POLICY IF EXISTS "Public select table_requests" ON public.table_requests;
CREATE POLICY "Public select table_requests"
  ON public.table_requests
  FOR SELECT
  TO public
  USING (true);

-- Authenticated staff/admin full access
DROP POLICY IF EXISTS "Staff full access table_requests" ON public.table_requests;
CREATE POLICY "Staff full access table_requests"
  ON public.table_requests
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 5. Add table_requests to Supabase Realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.table_requests;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
