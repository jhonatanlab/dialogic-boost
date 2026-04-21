-- Add inactivity columns to automations
ALTER TABLE public.automations
  ADD COLUMN inactivity_minutes integer DEFAULT NULL,
  ADD COLUMN max_followups integer DEFAULT 1;

-- Create automation_followups table
CREATE TABLE public.automation_followups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  followup_count integer NOT NULL DEFAULT 0,
  last_followup_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint
ALTER TABLE public.automation_followups
  ADD CONSTRAINT uq_automation_conversation UNIQUE (automation_id, conversation_id);

-- Index for performance
CREATE INDEX idx_automation_followups_company ON public.automation_followups(company_id);

-- Enable RLS
ALTER TABLE public.automation_followups ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view company followups"
  ON public.automation_followups FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage company followups"
  ON public.automation_followups FOR ALL TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Service role full access followups"
  ON public.automation_followups FOR ALL TO service_role
  USING (true) WITH CHECK (true);