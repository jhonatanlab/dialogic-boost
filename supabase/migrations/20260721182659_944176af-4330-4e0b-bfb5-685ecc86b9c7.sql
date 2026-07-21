
CREATE OR REPLACE FUNCTION public.set_company_llm_api_key(p_company_id uuid, p_api_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  v_key uuid;
  v_role text;
  v_company uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT role, company_id INTO v_role, v_company
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_company IS NULL OR v_company <> p_company_id THEN
    RAISE EXCEPTION 'forbidden: company mismatch';
  END IF;

  IF v_role NOT IN ('admin','owner') THEN
    RAISE EXCEPTION 'forbidden: insufficient role';
  END IF;

  IF p_api_key IS NULL OR length(trim(p_api_key)) = 0 THEN
    RAISE EXCEPTION 'api_key is empty';
  END IF;

  SELECT id INTO v_key FROM pgsodium.key WHERE name = 'company_llm_secrets' LIMIT 1;
  IF v_key IS NULL THEN
    v_key := (pgsodium.create_key(name := 'company_llm_secrets')).id;
  END IF;

  UPDATE public.companies
     SET llm_api_key_encrypted = pgsodium.crypto_aead_det_encrypt(
           convert_to(p_api_key, 'utf8'),
           convert_to(p_company_id::text, 'utf8'),
           v_key
         )
   WHERE id = p_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_company_llm_api_key(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_company_llm_api_key(uuid, text) TO authenticated;
