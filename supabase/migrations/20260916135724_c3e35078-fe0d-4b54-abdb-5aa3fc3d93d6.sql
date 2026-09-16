ALTER TABLE public.whatsapp_instances DROP CONSTRAINT IF EXISTS whatsapp_instances_provider_check;
ALTER TABLE public.whatsapp_instances ADD CONSTRAINT whatsapp_instances_provider_check
  CHECK (provider = ANY (ARRAY['evolution'::text, 'meta'::text, 'cloud_api'::text, 'zapster'::text]));

CREATE OR REPLACE FUNCTION public.save_instance_zapster_config(
  p_instance_id uuid,
  p_zapster_instance_id text,
  p_token text DEFAULT NULL,
  p_base_url text DEFAULT 'https://api.zapsterapi.com/v1'
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
  v_wh text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT company_id INTO v_user_company FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT company_id, evolution_api_key_secret_id, webhook_secret
    INTO v_inst_company, v_secret_id, v_wh
    FROM public.whatsapp_instances WHERE id = p_instance_id;

  IF v_inst_company IS NULL THEN RAISE EXCEPTION 'instance not found'; END IF;
  IF v_user_company IS NULL OR v_user_company <> v_inst_company THEN
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
$$;

GRANT EXECUTE ON FUNCTION public.save_instance_zapster_config(uuid, text, text, text) TO authenticated;