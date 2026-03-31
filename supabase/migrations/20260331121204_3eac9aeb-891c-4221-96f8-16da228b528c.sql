
-- 1. Chat settings per company
CREATE TABLE public.chat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE,
  distribution_mode text NOT NULL DEFAULT 'manual',
  max_conversations_per_agent integer DEFAULT NULL,
  only_assign_online_agents boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company chat_settings" ON public.chat_settings
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert own company chat_settings" ON public.chat_settings
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update own company chat_settings" ON public.chat_settings
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id());

-- 2. Agents table
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  is_online boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agents of own company" ON public.agents
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert agents of own company" ON public.agents
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update agents of own company" ON public.agents
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete agents of own company" ON public.agents
  FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id());

-- 3. Distribution state (round robin index)
CREATE TABLE public.distribution_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE,
  last_assigned_index integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.distribution_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company distribution_state" ON public.distribution_state
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can upsert own company distribution_state" ON public.distribution_state
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id());

-- 4. Distribution function (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.distribute_conversation(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_mode text;
  v_max_convs integer;
  v_only_online boolean;
  v_agents uuid[];
  v_agent_id uuid;
  v_last_idx integer;
  v_total integer;
  v_next_idx integer;
  v_least_agent uuid;
  v_hybrid_agents uuid[];
BEGIN
  -- Get conversation company
  SELECT company_id INTO v_company_id
  FROM conversations WHERE id = p_conversation_id;

  IF v_company_id IS NULL THEN RETURN; END IF;

  -- Get settings
  SELECT distribution_mode, max_conversations_per_agent, only_assign_online_agents
  INTO v_mode, v_max_convs, v_only_online
  FROM chat_settings WHERE company_id = v_company_id;

  -- Default to manual if no settings
  IF v_mode IS NULL OR v_mode = 'manual' THEN RETURN; END IF;

  -- Get eligible agents
  SELECT array_agg(a.user_id ORDER BY a.created_at)
  INTO v_agents
  FROM agents a
  WHERE a.company_id = v_company_id
    AND a.is_active = true
    AND (NOT v_only_online OR a.is_online = true);

  IF v_agents IS NULL OR array_length(v_agents, 1) = 0 THEN RETURN; END IF;

  -- Filter by max conversations limit
  IF v_max_convs IS NOT NULL THEN
    v_agents := ARRAY(
      SELECT u FROM unnest(v_agents) u
      WHERE (SELECT count(*) FROM conversations c
             WHERE c.assigned_to = u AND c.status IN ('open','in_progress') AND c.company_id = v_company_id) < v_max_convs
    );
    IF array_length(v_agents, 1) IS NULL OR array_length(v_agents, 1) = 0 THEN RETURN; END IF;
  END IF;

  v_total := array_length(v_agents, 1);

  IF v_mode = 'round_robin' THEN
    SELECT COALESCE(last_assigned_index, 0) INTO v_last_idx
    FROM distribution_state WHERE company_id = v_company_id;

    IF NOT FOUND THEN v_last_idx := 0; END IF;

    v_next_idx := (v_last_idx % v_total) + 1;
    v_agent_id := v_agents[v_next_idx];

    INSERT INTO distribution_state (company_id, last_assigned_index, updated_at)
    VALUES (v_company_id, v_next_idx, now())
    ON CONFLICT (company_id) DO UPDATE SET last_assigned_index = v_next_idx, updated_at = now();

  ELSIF v_mode = 'least_loaded' THEN
    SELECT u INTO v_agent_id
    FROM unnest(v_agents) u
    LEFT JOIN (
      SELECT assigned_to, count(*) as cnt FROM conversations
      WHERE status IN ('open','in_progress') AND company_id = v_company_id
      GROUP BY assigned_to
    ) cc ON cc.assigned_to = u
    ORDER BY COALESCE(cc.cnt, 0) ASC
    LIMIT 1;

  ELSIF v_mode = 'hybrid' THEN
    -- Get top 3 least loaded
    v_hybrid_agents := ARRAY(
      SELECT u FROM unnest(v_agents) u
      LEFT JOIN (
        SELECT assigned_to, count(*) as cnt FROM conversations
        WHERE status IN ('open','in_progress') AND company_id = v_company_id
        GROUP BY assigned_to
      ) cc ON cc.assigned_to = u
      ORDER BY COALESCE(cc.cnt, 0) ASC
      LIMIT 3
    );

    -- Round robin among them
    SELECT COALESCE(last_assigned_index, 0) INTO v_last_idx
    FROM distribution_state WHERE company_id = v_company_id;
    IF NOT FOUND THEN v_last_idx := 0; END IF;

    v_next_idx := (v_last_idx % array_length(v_hybrid_agents, 1)) + 1;
    v_agent_id := v_hybrid_agents[v_next_idx];

    INSERT INTO distribution_state (company_id, last_assigned_index, updated_at)
    VALUES (v_company_id, v_next_idx, now())
    ON CONFLICT (company_id) DO UPDATE SET last_assigned_index = v_next_idx, updated_at = now();
  END IF;

  IF v_agent_id IS NOT NULL THEN
    UPDATE conversations
    SET assigned_to = v_agent_id, status = 'in_progress', updated_at = now()
    WHERE id = p_conversation_id AND status = 'open';
  END IF;
END;
$$;

-- 5. Trigger to auto-distribute new conversations
CREATE OR REPLACE FUNCTION public.trigger_distribute_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'open' AND NEW.assigned_to IS NULL THEN
    PERFORM public.distribute_conversation(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_distribute_conversation
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_distribute_conversation();
