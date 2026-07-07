ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS current_agent text NOT NULL DEFAULT 'triagem';
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_current_agent_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_current_agent_check CHECK (current_agent IN ('triagem','sdr','suporte'));