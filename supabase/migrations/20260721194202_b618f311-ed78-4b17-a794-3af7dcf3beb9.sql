
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS llm_api_key_secret_id uuid;

CREATE OR REPLACE FUNCTION public.set_company_llm_api_key(p_company_id uuid, p_api_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_company uuid;
  v_secret_id uuid;
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT role, company_id INTO v_role, v_company
  FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  IF v_company IS NULL OR v_company <> p_company_id THEN
    RAISE EXCEPTION 'forbidden: company mismatch';
  END IF;
  IF v_role NOT IN ('admin','owner') THEN
    RAISE EXCEPTION 'forbidden: insufficient role';
  END IF;
  IF p_api_key IS NULL OR length(trim(p_api_key)) = 0 THEN
    RAISE EXCEPTION 'api_key is empty';
  END IF;

  SELECT llm_api_key_secret_id INTO v_secret_id FROM public.companies WHERE id = p_company_id;
  v_name := 'company_llm_api_key_' || p_company_id::text;

  IF v_secret_id IS NULL THEN
    v_secret_id := vault.create_secret(p_api_key, v_name, 'LLM API key for company ' || p_company_id::text);
    UPDATE public.companies SET llm_api_key_secret_id = v_secret_id WHERE id = p_company_id;
  ELSE
    PERFORM vault.update_secret(v_secret_id, p_api_key, v_name, 'LLM API key for company ' || p_company_id::text);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_company_llm_credentials(p_company_id uuid)
RETURNS TABLE(provider text, model text, api_key text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.llm_provider,
    c.llm_model,
    (SELECT s.decrypted_secret FROM vault.decrypted_secrets s WHERE s.id = c.llm_api_key_secret_id)
  FROM public.companies c
  WHERE c.id = p_company_id;
END;
$$;
