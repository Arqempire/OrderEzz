-- Enable Supabase Realtime publication on public.orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- Drop previous restricting select policy if present and allow public SELECT for tracking
DROP POLICY IF EXISTS "Customer select order by id" ON public.orders;
DROP POLICY IF EXISTS "Allow public select on orders for realtime tracking" ON public.orders;

CREATE POLICY "Allow public select on orders for realtime tracking"
  ON public.orders
  FOR SELECT
  TO public
  USING (true);
