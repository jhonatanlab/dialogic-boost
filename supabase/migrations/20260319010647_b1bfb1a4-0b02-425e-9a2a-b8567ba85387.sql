
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS instance_token text,
  ADD COLUMN IF NOT EXISTS hash text;
