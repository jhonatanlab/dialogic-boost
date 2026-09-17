-- Permite que o admin que criou a conexão a configure mesmo quando ela pertence a outra empresa.
CREATE OR REPLACE FUNCTION public.save_instance_evolution_config(p_instance_id uuid, p_base_url text, p_webhook_secret text, p_api_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_company uuid;
  v_inst_company uuid;
  v_owner uuid;
  v_secret_id uuid;
  v_secret_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT company_id INTO v_user_company FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT company_id, user_id, evolution_api_key_secret_id INTO v_inst_company, v_owner, v_secret_id
    FROM public.whatsapp_instances WHERE id = p_instance_id;

  IF v_inst_company IS NULL THEN RAISE EXCEPTION 'instance not found'; END IF;
  IF NOT ((v_user_company IS NOT NULL AND v_user_company = v_inst_company) OR v_owner = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: company mismatch';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin required';
  END IF;

  UPDATE public.whatsapp_instances
    SET evolution_base_url = NULLIF(trim(coalesce(p_base_url,'')), ''),
        webhook_secret = NULLIF(trim(coalesce(p_webhook_secret,'')), ''),
        updated_at = now()
    WHERE id = p_instance_id;

  IF p_api_key IS NOT NULL AND length(trim(p_api_key)) > 0 THEN
    v_secret_name := 'wa_evo_' || p_instance_id::text;
    IF v_secret_id IS NULL THEN
      SELECT id INTO v_secret_id FROM vault.secrets WHERE name = v_secret_name LIMIT 1;
    END IF;
    IF v_secret_id IS NULL THEN
      v_secret_id := vault.create_secret(trim(p_api_key), v_secret_name, 'Evolution API key for instance ' || p_instance_id::text);
    ELSE
      PERFORM vault.update_secret(v_secret_id, trim(p_api_key));
    END IF;
    UPDATE public.whatsapp_instances
      SET evolution_api_key_secret_id = v_secret_id
      WHERE id = p_instance_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_instance_vzaps_config(p_instance_id uuid, p_vzaps_instance_id text, p_instance_token text DEFAULT NULL::text, p_client_token text DEFAULT NULL::text, p_base_url text DEFAULT 'https://api.vzaps.com'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_company uuid;
  v_inst_company uuid;
  v_owner uuid;
  v_secret_id uuid;
  v_secret_name text;
  v_wh text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT company_id INTO v_user_company FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT company_id, user_id, evolution_api_key_secret_id, webhook_secret
    INTO v_inst_company, v_owner, v_secret_id, v_wh
    FROM public.whatsapp_instances WHERE id = p_instance_id;

  IF v_inst_company IS NULL THEN RAISE EXCEPTION 'instance not found'; END IF;
  IF NOT ((v_user_company IS NOT NULL AND v_user_company = v_inst_company) OR v_owner = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: company mismatch';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin required';
  END IF;

  IF v_wh IS NULL OR length(trim(v_wh)) = 0 THEN
    v_wh := replace(gen_random_uuid()::text, '-', '');
  END IF;

  UPDATE public.whatsapp_instances
    SET provider = 'vzaps',
        evolution_base_url = COALESCE(NULLIF(trim(coalesce(p_base_url,'')), ''), 'https://api.vzaps.com'),
        instance_id = COALESCE(NULLIF(trim(coalesce(p_vzaps_instance_id,'')), ''), instance_id),
        vzaps_client_token = COALESCE(NULLIF(trim(coalesce(p_client_token,'')), ''), vzaps_client_token),
        webhook_secret = v_wh,
        updated_at = now()
    WHERE id = p_instance_id;

  IF p_instance_token IS NOT NULL AND length(trim(p_instance_token)) > 0 THEN
    v_secret_name := 'wa_evo_' || p_instance_id::text;
    IF v_secret_id IS NULL THEN
      SELECT id INTO v_secret_id FROM vault.secrets WHERE name = v_secret_name LIMIT 1;
    END IF;
    IF v_secret_id IS NULL THEN
      v_secret_id := vault.create_secret(trim(p_instance_token), v_secret_name, 'WhatsApp provider token for instance ' || p_instance_id::text);
    ELSE
      PERFORM vault.update_secret(v_secret_id, trim(p_instance_token));
    END IF;
    UPDATE public.whatsapp_instances
      SET evolution_api_key_secret_id = v_secret_id
      WHERE id = p_instance_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_instance_zapster_config(p_instance_id uuid, p_zapster_instance_id text, p_token text DEFAULT NULL::text, p_base_url text DEFAULT 'https://api.zapsterapi.com/v1'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_company uuid;
  v_inst_company uuid;
  v_owner uuid;
  v_secret_id uuid;
  v_secret_name text;
  v_wh text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT company_id INTO v_user_company FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT company_id, user_id, evolution_api_key_secret_id, webhook_secret
    INTO v_inst_company, v_owner, v_secret_id, v_wh
    FROM public.whatsapp_instances WHERE id = p_instance_id;

  IF v_inst_company IS NULL THEN RAISE EXCEPTION 'instance not found'; END IF;
  IF NOT ((v_user_company IS NOT NULL AND v_user_company = v_inst_company) OR v_owner = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: company mismatch';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin required';
  END IF;

  IF v_wh IS NULL OR length(trim(v_wh)) = 0 THEN
    v_wh := replace(gen_random_uuid()::text, '-', '');
  END IF;

  UPDATE public.whatsapp_instances
    SET provider = 'zapster',
        evolution_base_url = COALESCE(NULLIF(trim(coalesce(p_base_url,'')), ''), 'https://api.zapsterapi.com/v1'),
        instance_id = COALESCE(NULLIF(trim(coalesce(p_zapster_instance_id,'')), ''), instance_id),
        webhook_secret = v_wh,
        updated_at = now()
    WHERE id = p_instance_id;

  IF p_token IS NOT NULL AND length(trim(p_token)) > 0 THEN
    v_secret_name := 'wa_evo_' || p_instance_id::text;
    IF v_secret_id IS NULL THEN
      SELECT id INTO v_secret_id FROM vault.secrets WHERE name = v_secret_name LIMIT 1;
    END IF;
    IF v_secret_id IS NULL THEN
      v_secret_id := vault.create_secret(trim(p_token), v_secret_name, 'WhatsApp provider token for instance ' || p_instance_id::text);
    ELSE
      PERFORM vault.update_secret(v_secret_id, trim(p_token));
    END IF;
    UPDATE public.whatsapp_instances
      SET evolution_api_key_secret_id = v_secret_id
      WHERE id = p_instance_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_instance_evolution_api_key(p_instance_id uuid, p_api_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgsodium'
AS $function$
DECLARE
  v_role text;
  v_user_company uuid;
  v_inst_company uuid;
  v_owner uuid;
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

  SELECT company_id, user_id INTO v_inst_company, v_owner
  FROM public.whatsapp_instances WHERE id = p_instance_id;

  IF v_inst_company IS NULL THEN
    RAISE EXCEPTION 'instance not found';
  END IF;

  IF NOT ((v_user_company IS NOT NULL AND v_user_company = v_inst_company) OR v_owner = auth.uid()) THEN
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
$function$;