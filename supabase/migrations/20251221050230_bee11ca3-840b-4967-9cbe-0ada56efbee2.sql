-- =====================================================
-- INBOX + CRM MODULE - COMPREHENSIVE MIGRATION
-- =====================================================

-- 1. Create app_role enum for permissions
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'agent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create user_roles table for RBAC
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 5. Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, member_user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 6. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 7. Add missing columns to contacts table
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

-- 8. Add missing columns to conversations table
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS assigned_team uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz;

-- 9. Add external_id index to messages for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id 
  ON public.messages(external_id) 
  WHERE external_id IS NOT NULL;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id_status ON public.conversations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON public.conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id_phone ON public.contacts(user_id, phone);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_conversation_id ON public.activity_logs(conversation_id);

-- 11. RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 12. RLS Policies for teams
CREATE POLICY "Users can view own teams" ON public.teams
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own teams" ON public.teams
  FOR ALL USING (auth.uid() = user_id);

-- 13. RLS Policies for team_members
CREATE POLICY "Users can view team members of their teams" ON public.team_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can manage team members of their teams" ON public.team_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND user_id = auth.uid())
  );

-- 14. RLS Policies for activity_logs
CREATE POLICY "Users can view own activity logs" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 15. Enable realtime for activity_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- 16. Trigger for teams updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();