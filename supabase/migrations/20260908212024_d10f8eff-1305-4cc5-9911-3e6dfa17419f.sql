ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS phone_secondary text,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS pre_sales_user_id uuid,
  ADD COLUMN IF NOT EXISTS sales_user_id uuid,
  ADD COLUMN IF NOT EXISTS referred_by text,
  ADD COLUMN IF NOT EXISTS cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS rg_cnh text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_district text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS crm_stage_id uuid,
  ADD COLUMN IF NOT EXISTS crm_position integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.crm_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#00D4D4',
  sort_order integer NOT NULL DEFAULT 0,
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_stages TO authenticated;
GRANT ALL ON public.crm_stages TO service_role;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_stages_select_company" ON public.crm_stages
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "crm_stages_insert_admin" ON public.crm_stages
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "crm_stages_update_admin" ON public.crm_stages
  FOR UPDATE TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "crm_stages_delete_admin" ON public.crm_stages
  FOR DELETE TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE TRIGGER update_crm_stages_updated_at
  BEFORE UPDATE ON public.crm_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_crm_stage_id_fkey
  FOREIGN KEY (crm_stage_id) REFERENCES public.crm_stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_crm_stage ON public.contacts (crm_stage_id, crm_position);
CREATE INDEX IF NOT EXISTS idx_crm_stages_company ON public.crm_stages (company_id, sort_order);

CREATE TABLE IF NOT EXISTS public.contact_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_files TO authenticated;
GRANT ALL ON public.contact_files TO service_role;
ALTER TABLE public.contact_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_files_select_company" ON public.contact_files
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "contact_files_insert_company" ON public.contact_files
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND uploaded_by = auth.uid());

CREATE POLICY "contact_files_delete_own_or_admin" ON public.contact_files
  FOR DELETE TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND (
      uploaded_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_contact_files_contact ON public.contact_files (contact_id, created_at DESC);

CREATE TRIGGER update_contact_files_updated_at
  BEFORE UPDATE ON public.contact_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();