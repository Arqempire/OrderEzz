-- 1. Set REPLICA IDENTITY FULL on public.menu_items so PostgreSQL includes complete row state in Realtime replication logs
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- 2. Enable Supabase Realtime publication on public.menu_items and customer_feedbacks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'menu_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'customer_feedbacks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_feedbacks;
  END IF;
END $$;
