CREATE TABLE public.contact_ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id),
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company summaries"
  ON public.contact_ai_summaries FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert company summaries"
  ON public.contact_ai_summaries FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER update_contact_ai_summaries_updated_at
  BEFORE UPDATE ON public.contact_ai_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();