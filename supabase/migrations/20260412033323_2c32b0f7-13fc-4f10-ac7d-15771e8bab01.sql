
CREATE TABLE IF NOT EXISTS public.ai_control (
  telefone TEXT NOT NULL,
  company_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (telefone, company_id)
);

ALTER TABLE public.ai_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view ai_control"
ON public.ai_control FOR SELECT TO authenticated
USING (company_id::uuid = get_user_company_id());

CREATE POLICY "Company members can insert ai_control"
ON public.ai_control FOR INSERT TO authenticated
WITH CHECK (company_id::uuid = get_user_company_id());

CREATE POLICY "Company members can update ai_control"
ON public.ai_control FOR UPDATE TO authenticated
USING (company_id::uuid = get_user_company_id());

CREATE POLICY "Company members can delete ai_control"
ON public.ai_control FOR DELETE TO authenticated
USING (company_id::uuid = get_user_company_id());
