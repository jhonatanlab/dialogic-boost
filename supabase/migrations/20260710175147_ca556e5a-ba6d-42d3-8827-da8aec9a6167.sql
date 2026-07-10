ALTER TABLE public.webhook_integrations
  ADD COLUMN IF NOT EXISTS default_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;