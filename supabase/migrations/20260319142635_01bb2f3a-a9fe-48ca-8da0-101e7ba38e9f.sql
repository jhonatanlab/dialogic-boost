DROP INDEX IF EXISTS public.messages_external_id_unique;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_external_id_unique;
ALTER TABLE public.messages ADD CONSTRAINT messages_external_id_unique UNIQUE (external_id);