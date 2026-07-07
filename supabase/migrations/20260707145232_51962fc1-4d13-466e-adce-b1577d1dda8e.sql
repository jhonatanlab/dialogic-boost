
-- Restrict conversation visibility by team for agents; admins/managers see all.

CREATE OR REPLACE FUNCTION public.user_can_view_conversation(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = _conversation_id
        AND (
          c.assigned_team IS NULL
          OR c.assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = c.assigned_team
              AND tm.member_user_id = auth.uid()
          )
        )
    )
$$;

DROP POLICY IF EXISTS "Restrict conversation view by team" ON public.conversations;
CREATE POLICY "Restrict conversation view by team"
ON public.conversations
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_can_view_conversation(id));

DROP POLICY IF EXISTS "Restrict conversation update by team" ON public.conversations;
CREATE POLICY "Restrict conversation update by team"
ON public.conversations
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.user_can_view_conversation(id))
WITH CHECK (public.user_can_view_conversation(id));

DROP POLICY IF EXISTS "Restrict conversation delete by team" ON public.conversations;
CREATE POLICY "Restrict conversation delete by team"
ON public.conversations
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.user_can_view_conversation(id));
