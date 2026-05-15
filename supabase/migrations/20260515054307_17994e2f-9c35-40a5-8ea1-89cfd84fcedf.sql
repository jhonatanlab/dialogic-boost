DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;

CREATE POLICY "Company users can update contacts"
ON public.contacts
FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());