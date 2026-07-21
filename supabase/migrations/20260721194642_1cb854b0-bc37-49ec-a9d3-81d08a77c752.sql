CREATE OR REPLACE FUNCTION public.debug_llm_key_info(p_company_id uuid)
RETURNS TABLE(key_len int, key_head text, key_tail text, has_whitespace boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_secret_id uuid; v_key text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not auth'; END IF;
  SELECT llm_api_key_secret_id INTO v_secret_id FROM companies WHERE id = p_company_id;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE id = v_secret_id;
  RETURN QUERY SELECT length(v_key), left(v_key,7), right(v_key,4), (v_key ~ '\s')::boolean;
END; $$;
GRANT EXECUTE ON FUNCTION public.debug_llm_key_info(uuid) TO authenticated;