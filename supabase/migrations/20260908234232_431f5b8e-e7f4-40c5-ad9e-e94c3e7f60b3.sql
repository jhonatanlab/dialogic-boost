
CREATE TABLE public.solar_financing_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_financing_banks TO authenticated;
GRANT ALL ON public.solar_financing_banks TO service_role;
ALTER TABLE public.solar_financing_banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sfb_select" ON public.solar_financing_banks FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "sfb_insert" ON public.solar_financing_banks FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "sfb_update" ON public.solar_financing_banks FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "sfb_delete" ON public.solar_financing_banks FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE INDEX idx_sfb_company ON public.solar_financing_banks(company_id);
CREATE TRIGGER trg_sfb_updated BEFORE UPDATE ON public.solar_financing_banks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.solar_financing_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_id uuid NOT NULL REFERENCES public.solar_financing_banks(id) ON DELETE CASCADE,
  term_months integer NOT NULL,
  monthly_interest_rate numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bank_id, term_months)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_financing_terms TO authenticated;
GRANT ALL ON public.solar_financing_terms TO service_role;
ALTER TABLE public.solar_financing_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sft_select" ON public.solar_financing_terms FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "sft_insert" ON public.solar_financing_terms FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "sft_update" ON public.solar_financing_terms FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "sft_delete" ON public.solar_financing_terms FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE INDEX idx_sft_company ON public.solar_financing_terms(company_id);
CREATE INDEX idx_sft_bank ON public.solar_financing_terms(bank_id);
CREATE TRIGGER trg_sft_updated BEFORE UPDATE ON public.solar_financing_terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.solar_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  margin_percent numeric,
  price_per_km numeric,
  base_visit_fee numeric,
  annual_tariff_inflation_percent numeric,
  annual_module_degradation_percent numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_pricing_config TO authenticated;
GRANT ALL ON public.solar_pricing_config TO service_role;
ALTER TABLE public.solar_pricing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spc_select" ON public.solar_pricing_config FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "spc_insert" ON public.solar_pricing_config FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "spc_update" ON public.solar_pricing_config FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "spc_delete" ON public.solar_pricing_config FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE INDEX idx_spc_company ON public.solar_pricing_config(company_id);
CREATE TRIGGER trg_spc_updated BEFORE UPDATE ON public.solar_pricing_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
