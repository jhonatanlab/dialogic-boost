
-- Table: automation_executions
CREATE TABLE public.automation_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'sent',
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company executions"
  ON public.automation_executions FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert company executions"
  ON public.automation_executions FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Service role full access executions"
  ON public.automation_executions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_automation_executions_automation ON public.automation_executions(automation_id);
CREATE INDEX idx_automation_executions_company_date ON public.automation_executions(company_id, executed_at);

-- Table: user_presence
CREATE TABLE public.user_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  session_started_at timestamptz,
  total_online_seconds bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company presence"
  ON public.user_presence FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own presence"
  ON public.user_presence FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presence"
  ON public.user_presence FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access presence"
  ON public.user_presence FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_user_presence_company_online ON public.user_presence(company_id, is_online);

-- Enable realtime for user_presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
