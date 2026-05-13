
-- Backfill company_id
UPDATE public.tags t
SET company_id = p.company_id
FROM public.profiles p
WHERE t.company_id IS NULL AND p.user_id = t.user_id;

UPDATE public.contact_tags ct
SET company_id = c.company_id
FROM public.contacts c
WHERE ct.company_id IS NULL AND c.id = ct.contact_id;

-- TAGS: reescrever policies por company_id
DROP POLICY IF EXISTS "Users can create their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can view their own tags" ON public.tags;

CREATE POLICY "Company users can view tags"
  ON public.tags FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can create tags"
  ON public.tags FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND user_id = auth.uid());

CREATE POLICY "Company users can update tags"
  ON public.tags FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can delete tags"
  ON public.tags FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id());

-- CONTACT_TAGS: reescrever policies por company_id
DROP POLICY IF EXISTS "Users can create contact_tags for their contacts" ON public.contact_tags;
DROP POLICY IF EXISTS "Users can delete contact_tags for their contacts" ON public.contact_tags;
DROP POLICY IF EXISTS "Users can view contact_tags for their contacts" ON public.contact_tags;

CREATE POLICY "Company users can view contact_tags"
  ON public.contact_tags FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company users can create contact_tags"
  ON public.contact_tags FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Company users can delete contact_tags"
  ON public.contact_tags FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id());
