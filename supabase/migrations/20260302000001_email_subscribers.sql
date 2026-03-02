-- Email subscribers for study guide / newsletter
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

-- Anonymous INSERT (no auth required)
CREATE POLICY "Anyone can subscribe"
  ON public.email_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only service role can SELECT/UPDATE/DELETE
CREATE POLICY "Service role full access"
  ON public.email_subscribers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
