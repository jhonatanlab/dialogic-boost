
-- ============== APPOINTMENTS ==============
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  user_id uuid,
  title text NOT NULL,
  phone text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  type text NOT NULL DEFAULT 'reuniao',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  google_event_id text,
  google_calendar_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can insert appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Company users can update appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Admins and managers can delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  );

CREATE INDEX idx_appointments_company_scheduled
  ON public.appointments (company_id, scheduled_at);
CREATE INDEX idx_appointments_contact ON public.appointments (contact_id);

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== GOOGLE CALENDAR TOKENS ==============
CREATE TABLE public.google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_id uuid NOT NULL,
  email text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_company_calendar boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_tokens TO authenticated;
GRANT ALL ON public.google_calendar_tokens TO service_role;

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users only see/manage their own token row
CREATE POLICY "Users can view own google token"
  ON public.google_calendar_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own google token"
  ON public.google_calendar_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own google token"
  ON public.google_calendar_tokens FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own google token"
  ON public.google_calendar_tokens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
