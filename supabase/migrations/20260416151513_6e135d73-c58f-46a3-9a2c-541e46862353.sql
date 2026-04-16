ALTER TABLE public.conversations 
ADD COLUMN pending_at timestamptz DEFAULT NULL;