
-- helper: is manager or admin of own company
CREATE OR REPLACE FUNCTION public.is_company_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin','manager')
  )
$$;

-- INVERTERS
CREATE TABLE public.solar_inverters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  model text,
  power_kw numeric,
  mppt_count integer,
  input_count integer,
  phases integer,
  efficiency numeric,
  description text,
  price numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_inverters TO authenticated;
GRANT ALL ON public.solar_inverters TO service_role;
ALTER TABLE public.solar_inverters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solar_inverters_select" ON public.solar_inverters FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "solar_inverters_insert" ON public.solar_inverters FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_inverters_update" ON public.solar_inverters FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_inverters_delete" ON public.solar_inverters FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE INDEX idx_solar_inverters_company ON public.solar_inverters(company_id);
CREATE TRIGGER trg_solar_inverters_updated BEFORE UPDATE ON public.solar_inverters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MODULES
CREATE TABLE public.solar_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  model text,
  power_wp numeric,
  technology text,
  width_mm numeric,
  height_mm numeric,
  weight_kg numeric,
  description text,
  price numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_modules TO authenticated;
GRANT ALL ON public.solar_modules TO service_role;
ALTER TABLE public.solar_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solar_modules_select" ON public.solar_modules FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "solar_modules_insert" ON public.solar_modules FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_modules_update" ON public.solar_modules FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_modules_delete" ON public.solar_modules FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE INDEX idx_solar_modules_company ON public.solar_modules(company_id);
CREATE TRIGGER trg_solar_modules_updated BEFORE UPDATE ON public.solar_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- KITS
CREATE TABLE public.solar_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  inverter_id uuid REFERENCES public.solar_inverters(id) ON DELETE SET NULL,
  module_id uuid REFERENCES public.solar_modules(id) ON DELETE SET NULL,
  module_quantity integer NOT NULL DEFAULT 1,
  kwp_total numeric,
  description text,
  price numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_kits TO authenticated;
GRANT ALL ON public.solar_kits TO service_role;
ALTER TABLE public.solar_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solar_kits_select" ON public.solar_kits FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "solar_kits_insert" ON public.solar_kits FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_kits_update" ON public.solar_kits FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_kits_delete" ON public.solar_kits FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE INDEX idx_solar_kits_company ON public.solar_kits(company_id);
CREATE TRIGGER trg_solar_kits_updated BEFORE UPDATE ON public.solar_kits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- UTILITIES
CREATE TABLE public.solar_utilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  state text,
  tariff_kwh numeric,
  minimum_fee numeric,
  description text,
  price numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_utilities TO authenticated;
GRANT ALL ON public.solar_utilities TO service_role;
ALTER TABLE public.solar_utilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solar_utilities_select" ON public.solar_utilities FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "solar_utilities_insert" ON public.solar_utilities FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_utilities_update" ON public.solar_utilities FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_utilities_delete" ON public.solar_utilities FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE INDEX idx_solar_utilities_company ON public.solar_utilities(company_id);
CREATE TRIGGER trg_solar_utilities_updated BEFORE UPDATE ON public.solar_utilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CITIES
CREATE TABLE public.solar_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  state text,
  latitude numeric,
  longitude numeric,
  irradiance_jan numeric,
  irradiance_fev numeric,
  irradiance_mar numeric,
  irradiance_abr numeric,
  irradiance_mai numeric,
  irradiance_jun numeric,
  irradiance_jul numeric,
  irradiance_ago numeric,
  irradiance_set numeric,
  irradiance_out numeric,
  irradiance_nov numeric,
  irradiance_dez numeric,
  description text,
  price numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_cities TO authenticated;
GRANT ALL ON public.solar_cities TO service_role;
ALTER TABLE public.solar_cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solar_cities_select" ON public.solar_cities FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "solar_cities_insert" ON public.solar_cities FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_cities_update" ON public.solar_cities FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_cities_delete" ON public.solar_cities FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE INDEX idx_solar_cities_company ON public.solar_cities(company_id);
CREATE TRIGGER trg_solar_cities_updated BEFORE UPDATE ON public.solar_cities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ROOF TYPES
CREATE TABLE public.solar_roof_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  loss_factor numeric,
  description text,
  price numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_roof_types TO authenticated;
GRANT ALL ON public.solar_roof_types TO service_role;
ALTER TABLE public.solar_roof_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solar_roof_types_select" ON public.solar_roof_types FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "solar_roof_types_insert" ON public.solar_roof_types FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_roof_types_update" ON public.solar_roof_types FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_roof_types_delete" ON public.solar_roof_types FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE INDEX idx_solar_roof_types_company ON public.solar_roof_types(company_id);
CREATE TRIGGER trg_solar_roof_types_updated BEFORE UPDATE ON public.solar_roof_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORIENTATIONS
CREATE TABLE public.solar_orientations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  azimuth numeric,
  loss_factor numeric,
  description text,
  price numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_orientations TO authenticated;
GRANT ALL ON public.solar_orientations TO service_role;
ALTER TABLE public.solar_orientations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solar_orientations_select" ON public.solar_orientations FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "solar_orientations_insert" ON public.solar_orientations FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_orientations_update" ON public.solar_orientations FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_orientations_delete" ON public.solar_orientations FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE INDEX idx_solar_orientations_company ON public.solar_orientations(company_id);
CREATE TRIGGER trg_solar_orientations_updated BEFORE UPDATE ON public.solar_orientations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CONNECTION TYPES
CREATE TABLE public.solar_connection_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phases integer,
  voltage numeric,
  minimum_kwh numeric,
  description text,
  price numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_connection_types TO authenticated;
GRANT ALL ON public.solar_connection_types TO service_role;
ALTER TABLE public.solar_connection_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solar_connection_types_select" ON public.solar_connection_types FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "solar_connection_types_insert" ON public.solar_connection_types FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_connection_types_update" ON public.solar_connection_types FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager()) WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE POLICY "solar_connection_types_delete" ON public.solar_connection_types FOR DELETE TO authenticated USING (company_id = public.get_user_company_id() AND public.is_company_manager());
CREATE INDEX idx_solar_connection_types_company ON public.solar_connection_types(company_id);
CREATE TRIGGER trg_solar_connection_types_updated BEFORE UPDATE ON public.solar_connection_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
