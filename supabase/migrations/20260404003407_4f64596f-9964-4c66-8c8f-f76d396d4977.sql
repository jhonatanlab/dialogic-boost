
DROP TABLE IF EXISTS public.automations;

CREATE TABLE public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Nova Automação',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'paused',
  trigger_type TEXT DEFAULT 'first_message',
  keyword TEXT,
  flow_data JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_execution TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automations from their company"
ON public.automations FOR SELECT TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)::uuid);

CREATE POLICY "Users can create automations for their company"
ON public.automations FOR INSERT TO authenticated
WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)::uuid);

CREATE POLICY "Users can update automations from their company"
ON public.automations FOR UPDATE TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)::uuid);

CREATE POLICY "Users can delete automations from their company"
ON public.automations FOR DELETE TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)::uuid);
