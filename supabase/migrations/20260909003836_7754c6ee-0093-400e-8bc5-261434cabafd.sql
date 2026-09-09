CREATE TABLE public.solar_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text,
  kit_id uuid REFERENCES public.solar_kits(id) ON DELETE SET NULL,
  city_id uuid REFERENCES public.solar_cities(id) ON DELETE SET NULL,
  roof_type_id uuid REFERENCES public.solar_roof_types(id) ON DELETE SET NULL,
  orientation_id uuid REFERENCES public.solar_orientations(id) ON DELETE SET NULL,
  connection_type_id uuid REFERENCES public.solar_connection_types(id) ON DELETE SET NULL,
  utility_id uuid REFERENCES public.solar_utilities(id) ON DELETE SET NULL,
  avg_monthly_consumption_kwh numeric NOT NULL,
  distance_km numeric NOT NULL DEFAULT 0,
  financing_bank_id uuid REFERENCES public.solar_financing_banks(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected')),
  kwp_total numeric,
  cash_price numeric,
  payback_months integer,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_proposals TO authenticated;
GRANT ALL ON public.solar_proposals TO service_role;

ALTER TABLE public.solar_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view proposals"
ON public.solar_proposals FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can create proposals"
ON public.solar_proposals FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Company users can update proposals"
ON public.solar_proposals FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Managers or authors can delete proposals"
ON public.solar_proposals FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id() AND (public.is_company_manager() OR created_by = auth.uid()));

CREATE INDEX idx_solar_proposals_company ON public.solar_proposals(company_id);
CREATE INDEX idx_solar_proposals_company_created ON public.solar_proposals(company_id, created_at DESC);

CREATE TRIGGER update_solar_proposals_updated_at
BEFORE UPDATE ON public.solar_proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();