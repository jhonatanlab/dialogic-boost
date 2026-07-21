
-- Ensure encryption key exists (idempotent)
DO $$
DECLARE v_key uuid;
BEGIN
  SELECT id INTO v_key FROM pgsodium.key WHERE name = 'company_llm_secrets' LIMIT 1;
  IF v_key IS NULL THEN
    PERFORM pgsodium.create_key(name := 'company_llm_secrets');
  END IF;
END $$;

-- Read function: never attempt to create key (STABLE-safe)
CREATE OR REPLACE FUNCTION public.get_company_llm_credentials(p_company_id uuid)
 RETURNS TABLE(provider text, model text, api_key text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pgsodium'
AS $function$
DECLARE
  v_key uuid;
BEGIN
  SELECT id INTO v_key FROM pgsodium.key WHERE name = 'company_llm_secrets' LIMIT 1;

  RETURN QUERY
  SELECT
    c.llm_provider,
    c.llm_model,
    CASE
      WHEN c.llm_api_key_encrypted IS NULL OR v_key IS NULL THEN NULL
      ELSE convert_from(
        pgsodium.crypto_aead_det_decrypt(
          c.llm_api_key_encrypted,
          convert_to(c.id::text, 'utf8'),
          v_key
        ), 'utf8')
    END
  FROM public.companies c
  WHERE c.id = p_company_id;
END;
$function$;
