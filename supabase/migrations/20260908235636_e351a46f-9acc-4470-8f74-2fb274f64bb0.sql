CREATE TABLE public.solar_branding (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  logo_url text,
  cover_background_url text,
  primary_color text,
  secondary_color text,
  footer_text text,
  footer_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  about_us_text text,
  mission_text text,
  vision_text text,
  values_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX solar_branding_company_id_key ON public.solar_branding (company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_branding TO authenticated;
GRANT ALL ON public.solar_branding TO service_role;

ALTER TABLE public.solar_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solar_branding_select" ON public.solar_branding
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "solar_branding_insert" ON public.solar_branding
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());

CREATE POLICY "solar_branding_update" ON public.solar_branding
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_manager())
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_manager());

CREATE POLICY "solar_branding_delete" ON public.solar_branding
  FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_company_manager());

CREATE TRIGGER trg_solar_branding_updated
  BEFORE UPDATE ON public.solar_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "branding_assets_company_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'branding-assets'
    AND (storage.foldername(name))[1] = public.get_user_company_id()::text
  );

CREATE POLICY "branding_assets_manager_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'branding-assets'
    AND (storage.foldername(name))[1] = public.get_user_company_id()::text
    AND public.is_company_manager()
  );

CREATE POLICY "branding_assets_manager_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'branding-assets'
    AND (storage.foldername(name))[1] = public.get_user_company_id()::text
    AND public.is_company_manager()
  );

CREATE POLICY "branding_assets_manager_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'branding-assets'
    AND (storage.foldername(name))[1] = public.get_user_company_id()::text
    AND public.is_company_manager()
  );