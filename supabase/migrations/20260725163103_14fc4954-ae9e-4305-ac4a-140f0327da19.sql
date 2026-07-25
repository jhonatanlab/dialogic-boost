
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS evolution_api_key_secret_id uuid;

DROP FUNCTION IF EXISTS public.get_instance_evolution_credentials(uuid);

CREATE OR REPLACE FUNCTION public.save_instance_evolution_config(
  p_instance_id uuid,
  p_base_url text,
  p_webhook_secret text,
  p_api_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_company uuid;
  v_inst_company uuid;
  v_secret_id uuid;
  v_secret_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT company_id INTO v_user_company FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT company_id, evolution_api_key_secret_id INTO v_inst_company, v_secret_id
    FROM public.whatsapp_instances WHERE id = p_instance_id;

  IF v_inst_company IS NULL THEN RAISE EXCEPTION 'instance not found'; END IF;
  IF v_user_company IS NULL OR v_user_company <> v_inst_company THEN
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
$$;

GRANT EXECUTE ON FUNCTION public.save_instance_evolution_config(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_instance_evolution_credentials(p_instance_id uuid)
RETURNS TABLE(base_url text, api_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret_id uuid;
  v_base text;
BEGIN
  SELECT evolution_base_url, evolution_api_key_secret_id
    INTO v_base, v_secret_id
  FROM public.whatsapp_instances WHERE id = p_instance_id;

  base_url := v_base;
  api_key := NULL;

  IF v_secret_id IS NOT NULL THEN
    SELECT decrypted_secret INTO api_key FROM vault.decrypted_secrets WHERE id = v_secret_id LIMIT 1;
  END IF;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_instance_evolution_credentials(uuid) TO authenticated, service_role;
