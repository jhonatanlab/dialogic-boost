SELECT cron.alter_job(
  j.jobid,
  schedule := '3 seconds',
  command := $cmd$
    select net.http_post(
      url:='https://neujvcpyjtrgiteqhgck.supabase.co/functions/v1/wa-process-buffer',
      headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ldWp2Y3B5anRyZ2l0ZXFoZ2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTQyNTMsImV4cCI6MjA3NzY3MDI1M30.yub3teleSe10alb373hfJBAPlZVzrz1QwvpRWmM8bjw"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $cmd$,
  active := true
)
FROM cron.job j
WHERE j.jobname = 'wa_flush_buffer';

-- Rollback:
-- SELECT cron.alter_job(j.jobid, active := false) FROM cron.job j WHERE j.jobname = 'wa_flush_buffer';