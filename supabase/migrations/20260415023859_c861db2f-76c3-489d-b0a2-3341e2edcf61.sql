
-- 1. Fix profiles role escalation: prevent users from changing their own role
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Allow admins/managers to update profiles in their company (including role changes)
CREATE POLICY "Admins and managers can update company profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id()
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- 2. Fix ai_control: remove public unrestricted access, add company-scoped policies
DROP POLICY IF EXISTS "allow_all_ai_control" ON public.ai_control;

CREATE POLICY "Authenticated users can view company ai_control"
ON public.ai_control
FOR SELECT
TO authenticated
USING (company_id = get_user_company_id()::text);

CREATE POLICY "Authenticated users can insert company ai_control"
ON public.ai_control
FOR INSERT
TO authenticated
WITH CHECK (company_id = get_user_company_id()::text);

CREATE POLICY "Authenticated users can update company ai_control"
ON public.ai_control
FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id()::text);

CREATE POLICY "Authenticated users can delete company ai_control"
ON public.ai_control
FOR DELETE
TO authenticated
USING (company_id = get_user_company_id()::text);

-- Also allow service_role full access (for edge functions/webhooks)
CREATE POLICY "Service role full access ai_control"
ON public.ai_control
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Fix whatsapp_integrations: change to company-scoped RLS
DROP POLICY IF EXISTS "Authenticated users can view their own integrations" ON public.whatsapp_integrations;
DROP POLICY IF EXISTS "Authenticated users can update their own integrations" ON public.whatsapp_integrations;
DROP POLICY IF EXISTS "Authenticated users can delete their own integrations" ON public.whatsapp_integrations;
DROP POLICY IF EXISTS "Authenticated users can create their own integrations" ON public.whatsapp_integrations;

CREATE POLICY "Users can view company integrations"
ON public.whatsapp_integrations
FOR SELECT
TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create company integrations"
ON public.whatsapp_integrations
FOR INSERT
TO authenticated
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update company integrations"
ON public.whatsapp_integrations
FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete company integrations"
ON public.whatsapp_integrations
FOR DELETE
TO authenticated
USING (company_id = get_user_company_id());

-- 4. Fix storage: add ownership verification to INSERT/DELETE policies
-- Drop existing overly permissive policies on chat-attachments
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload chat attachments" ON storage.objects;

CREATE POLICY "Company members can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = get_user_company_id()::text
);

-- Drop and recreate media-messages INSERT/DELETE policies
DROP POLICY IF EXISTS "Authenticated users can upload media messages" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload media messages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete media messages" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete media messages" ON storage.objects;

CREATE POLICY "Company members can upload media messages"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-messages'
  AND (storage.foldername(name))[1] = get_user_company_id()::text
);

CREATE POLICY "Company members can delete media messages"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media-messages'
  AND (storage.foldername(name))[1] = get_user_company_id()::text
);
