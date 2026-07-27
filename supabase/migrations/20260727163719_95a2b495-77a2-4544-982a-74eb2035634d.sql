
DROP FUNCTION IF EXISTS public.get_instance_evolution_credentials(uuid);

CREATE OR REPLACE FUNCTION public.get_instance_evolution_credentials(p_instance_id uuid)
RETURNS TABLE(base_url text, api_key text, webhook_secret text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_secret_id uuid;
  v_base text;
  v_wh text;
BEGIN
  SELECT evolution_base_url, evolution_api_key_secret_id, whatsapp_instances.webhook_secret
    INTO v_base, v_secret_id, v_wh
  FROM public.whatsapp_instances WHERE id = p_instance_id;

  base_url := v_base;
  webhook_secret := v_wh;
  api_key := NULL;

  IF v_secret_id IS NOT NULL THEN
    SELECT decrypted_secret INTO api_key FROM vault.decrypted_secrets WHERE id = v_secret_id LIMIT 1;
  END IF;

  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_instance_evolution_credentials(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_instance_evolution_credentials(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_instance_evolution_credentials(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_instance_evolution_credentials(uuid) TO service_role;
