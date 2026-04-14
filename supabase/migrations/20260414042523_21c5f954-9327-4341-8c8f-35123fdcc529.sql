CREATE POLICY "Users can view company profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());