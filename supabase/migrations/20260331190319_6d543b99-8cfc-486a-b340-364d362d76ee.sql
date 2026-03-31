ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS attachment_url text DEFAULT NULL;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text';