
CREATE TABLE public.webhook_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  welcome_message text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view webhook_integrations"
  ON public.webhook_integrations FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Company users can create webhook_integrations"
  ON public.webhook_integrations FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Company users can update webhook_integrations"
  ON public.webhook_integrations FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Company users can delete webhook_integrations"
  ON public.webhook_integrations FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Service role full access webhook_integrations"
  ON public.webhook_integrations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_webhook_integrations_updated_at
  BEFORE UPDATE ON public.webhook_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.webhook_integrations(id) ON DELETE CASCADE,
  company_id uuid,
  payload jsonb,
  status text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view webhook_logs"
  ON public.webhook_logs FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Service role full access webhook_logs"
  ON public.webhook_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_webhook_logs_integration ON public.webhook_logs(integration_id, created_at DESC);
