
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'all';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp';
