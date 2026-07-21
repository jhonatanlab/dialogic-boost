
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS ai_pipeline_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'delivered'::text, 'read'::text, 'failed'::text, 'received'::text, 'server_ack'::text]));
