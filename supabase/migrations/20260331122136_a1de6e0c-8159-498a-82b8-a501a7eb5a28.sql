
-- Drop existing restrictive RLS policies on conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

-- Create company-wide RLS policies for conversations
CREATE POLICY "Users can view company conversations"
ON public.conversations FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can update company conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create company conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id() OR user_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
ON public.conversations FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Also update messages RLS to allow viewing company-wide messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view company messages"
ON public.messages FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

-- Update messages insert policy to be more flexible
DROP POLICY IF EXISTS "Users can create their own messages" ON public.messages;
CREATE POLICY "Users can create company messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id() OR user_id = auth.uid());

-- Update messages update policy
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update company messages"
ON public.messages FOR UPDATE TO authenticated
USING (company_id = get_user_company_id());
