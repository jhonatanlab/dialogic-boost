CREATE POLICY "Admins and managers can delete company contacts"
ON public.contacts
FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  )
);