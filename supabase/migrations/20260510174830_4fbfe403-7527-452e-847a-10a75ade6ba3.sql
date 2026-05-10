DROP POLICY IF EXISTS "Users can view own teams" ON public.teams;

CREATE POLICY "Users can view company teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);