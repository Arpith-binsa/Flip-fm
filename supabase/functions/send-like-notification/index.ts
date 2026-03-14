-- Queue table for pending like notifications
CREATE TABLE IF NOT EXISTS public.like_notifications (
  id SERIAL PRIMARY KEY,
  liked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  liker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.like_notifications ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only"
  ON public.like_notifications
  USING (false);

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule digest at 4pm UTC daily
SELECT cron.schedule(
  'send-like-digest',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ttmjxebskqcrbbrwtcrf.supabase.co/functions/v1/send-like-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);