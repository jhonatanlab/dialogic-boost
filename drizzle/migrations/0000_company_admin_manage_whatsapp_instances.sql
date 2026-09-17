-- Permitir que admins/gestores da própria empresa gerenciem as conexões de WhatsApp
CREATE POLICY "Company admins can view company instances"
ON public.whatsapp_instances
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id() AND public.is_company_manager());

CREATE POLICY "Company admins can update company instances"
ON public.whatsapp_instances
FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id() AND public.is_company_manager());

CREATE POLICY "Company admins can delete company instances"
ON public.whatsapp_instances
FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id() AND public.is_company_manager());