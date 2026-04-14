CREATE POLICY "Users can delete company summaries"
ON public.contact_ai_summaries
FOR DELETE
TO authenticated
USING (company_id = get_user_company_id());