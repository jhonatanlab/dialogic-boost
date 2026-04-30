-- Unschedule existing job if present (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('expire-pending-checkins');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-pending-checkins',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://neujvcpyjtrgiteqhgck.supabase.co/functions/v1/expire-pending-checkins',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ldWp2Y3B5anRyZ2l0ZXFoZ2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTQyNTMsImV4cCI6MjA3NzY3MDI1M30.yub3teleSe10alb373hfJBAPlZVzrz1QwvpRWmM8bjw"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);