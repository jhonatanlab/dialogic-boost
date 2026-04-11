CREATE POLICY "Users can view company settings"
ON public.admin_settings
FOR SELECT
TO authenticated
USING (company_id = get_user_company_id());