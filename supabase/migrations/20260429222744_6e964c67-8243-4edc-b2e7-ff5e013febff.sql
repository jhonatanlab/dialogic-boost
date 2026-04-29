
CREATE OR REPLACE FUNCTION public.delete_contact_cascade(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_phone text;
  v_phone_norm text;
  v_phone_no9 text;
  v_caller_company uuid;
BEGIN
  -- Fetch contact
  SELECT company_id, phone INTO v_company_id, v_phone
  FROM public.contacts
  WHERE id = p_contact_id;

  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  -- Tenant guard: caller must belong to the same company
  v_caller_company := public.get_user_company_id();
  IF v_caller_company IS NULL OR v_caller_company <> v_company_id THEN
    RAISE EXCEPTION 'forbidden: contact belongs to a different company';
  END IF;

  -- Normalize phone for ai_control matching
  v_phone_norm := COALESCE(regexp_replace(COALESCE(v_phone, ''), '\D', '', 'g'), '');

  -- Brazilian variant: drop the leading "9" of mobile (13 digits, prefix 55)
  IF length(v_phone_norm) = 13 AND substring(v_phone_norm, 1, 2) = '55' AND substring(v_phone_norm, 5, 1) = '9' THEN
    v_phone_no9 := substring(v_phone_norm, 1, 4) || substring(v_phone_norm, 6);
  ELSIF length(v_phone_norm) = 12 AND substring(v_phone_norm, 1, 2) = '55' THEN
    -- Already without the 9; also try the variant WITH 9 in case ai_control stored it that way
    v_phone_no9 := substring(v_phone_norm, 1, 4) || '9' || substring(v_phone_norm, 5);
  ELSE
    v_phone_no9 := v_phone_norm;
  END IF;

  -- Cascading deletes (children first)
  DELETE FROM public.conversation_events
   WHERE conversation_id IN (SELECT id FROM public.conversations WHERE contact_id = p_contact_id);

  DELETE FROM public.messages WHERE contact_id = p_contact_id;
  DELETE FROM public.automation_executions WHERE contact_id = p_contact_id;
  DELETE FROM public.automation_followups WHERE contact_id = p_contact_id;
  DELETE FROM public.campaign_contacts WHERE contact_id = p_contact_id;
  DELETE FROM public.checkin_records WHERE contact_id = p_contact_id;
  DELETE FROM public.fidelity_cards WHERE contact_id = p_contact_id;
  DELETE FROM public.contact_ai_summaries WHERE contact_id = p_contact_id;
  DELETE FROM public.contact_custom_fields WHERE contact_id = p_contact_id;
  DELETE FROM public.contact_notes WHERE contact_id = p_contact_id;
  DELETE FROM public.contact_tags WHERE contact_id = p_contact_id;
  DELETE FROM public.activity_logs WHERE contact_id = p_contact_id;
  DELETE FROM public.conversations WHERE contact_id = p_contact_id;

  -- ai_control uses (company_id text, telefone text); match both normalized variants
  IF v_phone_norm <> '' THEN
    DELETE FROM public.ai_control
     WHERE company_id = v_company_id::text
       AND telefone IN (v_phone_norm, v_phone_no9);
  END IF;

  -- Finally, the contact itself
  DELETE FROM public.contacts WHERE id = p_contact_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_contact_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_contact_cascade(uuid) TO authenticated;
