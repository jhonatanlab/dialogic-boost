-- Allow 'completed' and 'expired' statuses (no enum, just text — already supported)

-- DELETE policy for checkin_records
DROP POLICY IF EXISTS "Admins and managers can delete company checkin records" ON public.checkin_records;
CREATE POLICY "Admins and managers can delete company checkin records"
  ON public.checkin_records
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  );

-- Service role full access for cron worker
DROP POLICY IF EXISTS "Service role full access checkin_records" ON public.checkin_records;
CREATE POLICY "Service role full access checkin_records"
  ON public.checkin_records
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- RPC: process_checkin_token
-- Identifies a pending check-in by token, binds it to the contact,
-- marks it completed, and applies fidelity card logic.
-- Returns JSON with completion info so webhook can send congrats msg.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_checkin_token(
  p_token text,
  p_company_id uuid,
  p_contact_id uuid,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record record;
  v_program record;
  v_card record;
  v_new_stamps integer;
  v_completed boolean := false;
  v_congrats text := null;
  v_reward text := null;
BEGIN
  IF p_token IS NULL OR p_company_id IS NULL OR p_contact_id IS NULL THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'missing_params');
  END IF;

  -- Find pending checkin record by token (case-insensitive) within company
  SELECT * INTO v_record
  FROM public.checkin_records
  WHERE upper(token) = upper(p_token)
    AND company_id = p_company_id
    AND status = 'pending'
  ORDER BY timestamp DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'no_pending_record');
  END IF;

  -- Bind contact and complete the checkin
  UPDATE public.checkin_records
  SET whatsapp_user = p_phone,
      contact_id = p_contact_id,
      status = 'completed'
  WHERE id = v_record.id;

  -- Look for active fidelity program for this company
  SELECT * INTO v_program
  FROM public.fidelity_programs
  WHERE company_id = p_company_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'matched', true,
      'completed_card', false,
      'checkin_id', v_record.id
    );
  END IF;

  -- Find or create active card for (contact, program)
  SELECT * INTO v_card
  FROM public.fidelity_cards
  WHERE contact_id = p_contact_id
    AND fidelity_program_id = v_program.id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.fidelity_cards (
      contact_id, fidelity_program_id, current_stamps, target_stamps,
      status, last_checkin_id, company_id
    ) VALUES (
      p_contact_id, v_program.id, 1, v_program.goal,
      'active', v_record.id, p_company_id
    )
    RETURNING * INTO v_card;
    v_new_stamps := 1;
  ELSE
    v_new_stamps := v_card.current_stamps + 1;
    UPDATE public.fidelity_cards
    SET current_stamps = v_new_stamps,
        last_checkin_id = v_record.id,
        updated_at = now()
    WHERE id = v_card.id;
  END IF;

  -- Check if completed
  IF v_new_stamps >= v_card.target_stamps THEN
    UPDATE public.fidelity_cards
    SET status = 'completed', updated_at = now()
    WHERE id = v_card.id;

    v_completed := true;
    v_congrats := v_program.congratulations_message;
    v_reward := v_program.reward;

    -- Start a new active card for the next cycle
    INSERT INTO public.fidelity_cards (
      contact_id, fidelity_program_id, current_stamps, target_stamps,
      status, company_id
    ) VALUES (
      p_contact_id, v_program.id, 0, v_program.goal,
      'active', p_company_id
    );
  END IF;

  RETURN jsonb_build_object(
    'matched', true,
    'checkin_id', v_record.id,
    'completed_card', v_completed,
    'current_stamps', v_new_stamps,
    'target_stamps', v_card.target_stamps,
    'congratulations_message', v_congrats,
    'reward', v_reward
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: expire_pending_checkins
-- Marks pending check-ins older than 30 minutes as 'expired'.
-- Called by edge function via cron.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_pending_checkins()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.checkin_records
  SET status = 'expired'
  WHERE status = 'pending'
    AND timestamp < now() - interval '30 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;