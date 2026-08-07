-- 1. Create customer_feedbacks table
CREATE TABLE IF NOT EXISTS public.customer_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  table_number INT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[] DEFAULT '{}',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON public.customer_feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON public.customer_feedbacks(rating);

-- Enable RLS
ALTER TABLE public.customer_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert customer_feedbacks"
  ON public.customer_feedbacks
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public select customer_feedbacks"
  ON public.customer_feedbacks
  FOR SELECT
  TO public
  USING (true);
