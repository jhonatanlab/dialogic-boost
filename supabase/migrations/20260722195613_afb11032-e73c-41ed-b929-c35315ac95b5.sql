
CREATE OR REPLACE FUNCTION public.set_instance_evolution_api_key(p_instance_id uuid, p_api_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  v_role text;
  v_user_company uuid;
  v_inst_company uuid;
  v_key uuid;
  v_encrypted bytea;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_api_key IS NULL OR length(trim(p_api_key)) = 0 THEN
    RAISE EXCEPTION 'api_key is empty';
  END IF;

  SELECT role, company_id INTO v_role, v_user_company
  FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  SELECT company_id INTO v_inst_company
  FROM public.whatsapp_instances WHERE id = p_instance_id;

  IF v_inst_company IS NULL THEN
    RAISE EXCEPTION 'instance not found';
  END IF;

  IF v_user_company IS NULL OR v_user_company <> v_inst_company THEN
    RAISE EXCEPTION 'forbidden: company mismatch';
  END IF;

  IF v_role NOT IN ('admin','owner') THEN
    RAISE EXCEPTION 'forbidden: insufficient role';
  END IF;

  SELECT id INTO v_key FROM pgsodium.key WHERE name = 'wa_instance_secrets' LIMIT 1;
  IF v_key IS NULL THEN
    v_key := (pgsodium.create_key(name := 'wa_instance_secrets')).id;
  END IF;

  v_encrypted := pgsodium.crypto_aead_det_encrypt(
    convert_to(p_api_key, 'utf8'),
    convert_to(p_instance_id::text, 'utf8'),
    v_key
  );

  UPDATE public.whatsapp_instances
     SET evolution_api_key_encrypted = v_encrypted,
         updated_at = now()
   WHERE id = p_instance_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_instance_evolution_api_key(uuid, text) TO authenticated;
