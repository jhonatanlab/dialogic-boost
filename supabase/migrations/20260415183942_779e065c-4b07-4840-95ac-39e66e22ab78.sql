
-- Add company-wide SELECT policy for contacts so all company members can view shared contacts
CREATE POLICY "Users can view company contacts"
ON public.contacts FOR SELECT
TO authenticated
USING (company_id = get_user_company_id());
