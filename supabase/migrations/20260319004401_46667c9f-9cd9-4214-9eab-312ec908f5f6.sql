
-- 1. Create companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS for companies: users can see their own company
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT TO authenticated
  USING (id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own company" ON public.companies
  FOR UPDATE TO authenticated
  USING (id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- 4. RLS for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Add tenant_id (company_id) to all existing data tables
ALTER TABLE public.contacts ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.conversations ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.messages ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.campaigns ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.campaign_contacts ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.tags ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.contact_tags ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.contact_notes ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.custom_fields ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.contact_custom_fields ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.message_templates ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.quick_replies ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.checkin_links ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.checkin_records ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.fidelity_programs ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.fidelity_cards ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.whatsapp_integrations ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.whatsapp_instances ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.activity_logs ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.incoming_messages ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.teams ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.team_members ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.admin_settings ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- 6. Updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Function to get current user's company_id (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;
