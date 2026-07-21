-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1) whatsapp_instances: novas colunas
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'evolution',
  ADD COLUMN IF NOT EXISTS evolution_base_url text,
  ADD COLUMN IF NOT EXISTS evolution_api_key_encrypted bytea,
  ADD COLUMN IF NOT EXISTS cloud_api_phone_number_id text,
  ADD COLUMN IF NOT EXISTS cloud_api_token_encrypted bytea,
  ADD COLUMN IF NOT EXISTS webhook_secret text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_instances_provider_check') THEN
    ALTER TABLE public.whatsapp_instances
      ADD CONSTRAINT whatsapp_instances_provider_check
      CHECK (provider IN ('evolution','meta','cloud_api'));
  END IF;
END $$;

-- 2) companies: novas colunas IA
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS llm_provider text NOT NULL DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS llm_model text,
  ADD COLUMN IF NOT EXISTS llm_api_key_encrypted bytea,
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS debounce_seconds integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_llm_provider_check') THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_llm_provider_check
      CHECK (llm_provider IN ('openai','anthropic','groq'));
  END IF;
END $$;

-- 3) Funções de leitura descriptografada
CREATE OR REPLACE FUNCTION public.get_instance_evolution_credentials(p_instance_id uuid)
RETURNS TABLE (base_url text, api_key text, webhook_secret text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  v_key uuid;
BEGIN
  SELECT id INTO v_key FROM pgsodium.key WHERE name = 'wa_instance_secrets' LIMIT 1;
  IF v_key IS NULL THEN
    v_key := (pgsodium.create_key(name := 'wa_instance_secrets')).id;
  END IF;

  RETURN QUERY
  SELECT
    wi.evolution_base_url,
    CASE WHEN wi.evolution_api_key_encrypted IS NULL THEN NULL
         ELSE convert_from(
           pgsodium.crypto_aead_det_decrypt(
             wi.evolution_api_key_encrypted,
             convert_to(wi.id::text, 'utf8'),
             v_key
           ), 'utf8')
    END,
    wi.webhook_secret
  FROM public.whatsapp_instances wi
  WHERE wi.id = p_instance_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_instance_evolution_credentials(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_instance_evolution_credentials(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_company_llm_credentials(p_company_id uuid)
RETURNS TABLE (provider text, model text, api_key text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  v_key uuid;
BEGIN
  SELECT id INTO v_key FROM pgsodium.key WHERE name = 'company_llm_secrets' LIMIT 1;
  IF v_key IS NULL THEN
    v_key := (pgsodium.create_key(name := 'company_llm_secrets')).id;
  END IF;

  RETURN QUERY
  SELECT
    c.llm_provider,
    c.llm_model,
    CASE WHEN c.llm_api_key_encrypted IS NULL THEN NULL
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
$$;

REVOKE ALL ON FUNCTION public.get_company_llm_credentials(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_llm_credentials(uuid) TO service_role;

-- 4) message_buffer
CREATE TABLE IF NOT EXISTS public.message_buffer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE UNIQUE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  flush_at timestamptz NOT NULL,
  last_message_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.message_buffer TO service_role;

CREATE INDEX IF NOT EXISTS message_buffer_status_flush_idx ON public.message_buffer (status, flush_at);
CREATE INDEX IF NOT EXISTS message_buffer_company_idx ON public.message_buffer (company_id);

ALTER TABLE public.message_buffer ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='message_buffer'
      AND policyname='service_role_all_message_buffer'
  ) THEN
    CREATE POLICY service_role_all_message_buffer ON public.message_buffer
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_message_buffer_updated_at ON public.message_buffer;
CREATE TRIGGER update_message_buffer_updated_at
  BEFORE UPDATE ON public.message_buffer
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Policy do bucket whatsapp-media (bucket criado via storage_create_bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='wa_media_service_role_all'
  ) THEN
    CREATE POLICY wa_media_service_role_all ON storage.objects
      FOR ALL TO service_role
      USING (bucket_id = 'whatsapp-media')
      WITH CHECK (bucket_id = 'whatsapp-media');
  END IF;
END $$;

-- 6) Cron job wa_flush_buffer (INATIVO)
-- Para reativar no Prompt 3:
--   SELECT cron.alter_job(
--     (SELECT jobid FROM cron.job WHERE jobname='wa_flush_buffer'),
--     schedule := '*/2 * * * * *',
--     command  := $$SELECT net.http_post(
--       url := 'https://<PROJECT>.functions.supabase.co/flush-message-buffer',
--       headers := jsonb_build_object('Authorization','Bearer <SERVICE_ROLE>')
--     );$$,
--     active   := true
--   );
DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'wa_flush_buffer';
  IF v_jobid IS NULL THEN
    v_jobid := cron.schedule('wa_flush_buffer', '* * * * *', 'SELECT 1');
  END IF;
  PERFORM cron.alter_job(v_jobid, active := false);
END $$;

-- =====================================================================
-- ROLLBACK (manual):
-- DO $$ DECLARE v_jobid bigint; BEGIN
--   SELECT jobid INTO v_jobid FROM cron.job WHERE jobname='wa_flush_buffer';
--   IF v_jobid IS NOT NULL THEN PERFORM cron.unschedule(v_jobid); END IF;
-- END $$;
-- DROP POLICY IF EXISTS wa_media_service_role_all ON storage.objects;
-- DROP TABLE IF EXISTS public.message_buffer;
-- DROP FUNCTION IF EXISTS public.get_company_llm_credentials(uuid);
-- DROP FUNCTION IF EXISTS public.get_instance_evolution_credentials(uuid);
-- ALTER TABLE public.companies
--   DROP CONSTRAINT IF EXISTS companies_llm_provider_check,
--   DROP COLUMN IF EXISTS llm_provider, DROP COLUMN IF EXISTS llm_model,
--   DROP COLUMN IF EXISTS llm_api_key_encrypted, DROP COLUMN IF EXISTS system_prompt,
--   DROP COLUMN IF EXISTS agent_name, DROP COLUMN IF EXISTS debounce_seconds,
--   DROP COLUMN IF EXISTS ai_enabled;
-- ALTER TABLE public.whatsapp_instances
--   DROP CONSTRAINT IF EXISTS whatsapp_instances_provider_check,
--   DROP COLUMN IF EXISTS provider, DROP COLUMN IF EXISTS evolution_base_url,
--   DROP COLUMN IF EXISTS evolution_api_key_encrypted, DROP COLUMN IF EXISTS cloud_api_phone_number_id,
--   DROP COLUMN IF EXISTS cloud_api_token_encrypted, DROP COLUMN IF EXISTS webhook_secret;
