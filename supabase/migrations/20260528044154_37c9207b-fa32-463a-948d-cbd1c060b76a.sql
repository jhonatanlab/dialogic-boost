
-- 1) incoming_messages: SELECT only for authenticated
DROP POLICY IF EXISTS "Users can view their own incoming messages" ON public.incoming_messages;
CREATE POLICY "Users can view their own incoming messages"
ON public.incoming_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2) profiles: prevent role escalation via the manager/admin update policy
DROP POLICY IF EXISTS "Admins and managers can update company profiles" ON public.profiles;
CREATE POLICY "Admins and managers can update company profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (company_id = public.get_user_company_id())
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  company_id = public.get_user_company_id()
  AND (
    -- role unchanged
    role = (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id LIMIT 1)
    -- or only admins can change roles, and never to 'admin'
    OR (public.has_role(auth.uid(), 'admin'::app_role) AND role IN ('agent','manager'))
  )
);

-- 3) whatsapp_instances: restrict INSERT/UPDATE to authenticated
DROP POLICY IF EXISTS "Users can insert own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can insert own instances"
ON public.whatsapp_instances
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can update own instances"
ON public.whatsapp_instances
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can delete own instances"
ON public.whatsapp_instances
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can view own instances"
ON public.whatsapp_instances
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4) webhook_integrations: restrict SELECT to admin/manager (tokens)
DROP POLICY IF EXISTS "Company users can view webhook_integrations" ON public.webhook_integrations;
CREATE POLICY "Admins and managers can view webhook_integrations"
ON public.webhook_integrations
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
);

-- 5) whatsapp_integrations: restrict SELECT to admin/manager (tokens)
DROP POLICY IF EXISTS "Users can view company integrations" ON public.whatsapp_integrations;
CREATE POLICY "Admins and managers can view company integrations"
ON public.whatsapp_integrations
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
);
