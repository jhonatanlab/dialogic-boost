
-- Table to store conversation events (started, closed, transferred, etc.)
CREATE TABLE public.conversation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  event_type TEXT NOT NULL, -- 'started', 'closed', 'transferred_agent', 'transferred_team', 'reopened'
  actor_user_id UUID NOT NULL, -- who performed the action
  actor_name TEXT, -- cached name for display
  target_user_id UUID, -- for transfers: target agent
  target_name TEXT, -- cached name for display
  target_team_id UUID, -- for team transfers
  target_team_name TEXT, -- cached team name
  details JSONB, -- any extra info
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_conversation_events_conv ON public.conversation_events(conversation_id, created_at);

-- Enable RLS
ALTER TABLE public.conversation_events ENABLE ROW LEVEL SECURITY;

-- RLS: users can view events for their company's conversations
CREATE POLICY "Users can view company conversation events"
ON public.conversation_events FOR SELECT TO authenticated
USING (company_id = get_user_company_id());

-- RLS: users can insert events for their company
CREATE POLICY "Users can create conversation events"
ON public.conversation_events FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_events;
