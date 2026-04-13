ALTER TABLE public.messages
  ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;

UPDATE public.messages SET sent_at = created_at WHERE sent_at IS NULL;