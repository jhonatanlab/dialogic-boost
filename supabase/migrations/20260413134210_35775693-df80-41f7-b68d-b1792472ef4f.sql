-- Backfill remaining NULLs
UPDATE public.messages SET sent_at = created_at WHERE sent_at IS NULL;

-- Set default so future inserts always have sent_at
ALTER TABLE public.messages ALTER COLUMN sent_at SET DEFAULT now();