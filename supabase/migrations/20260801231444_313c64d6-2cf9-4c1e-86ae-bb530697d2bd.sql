CREATE OR REPLACE FUNCTION public.extract_ai_real_name(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_match text[];
  v_name text;
BEGIN
  IF p_text IS NULL THEN RETURN NULL; END IF;
  v_match := regexp_match(p_text, '##\s*NOME_REAL\s*:\s*([^#]{1,60})##', 'i');
  IF v_match IS NULL THEN RETURN NULL; END IF;

  v_name := btrim(regexp_replace(v_match[1], '\s+', ' ', 'g'));
  IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 60 THEN RETURN NULL; END IF;
  IF v_name !~ '^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ''\-\. ]{1,59}$' THEN RETURN NULL; END IF;
  IF lower(v_name) IN ('cliente','lead','contato','desconhecido','nao informado','não informado','n/a','na','none','null','sem nome','usuario','usuário') THEN
    RETURN NULL;
  END IF;

  RETURN initcap(v_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.strip_ai_name_marker(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT btrim(regexp_replace(
           regexp_replace(coalesce(p_text, ''), '##\s*NOME_REAL\s*:[^#]{0,60}##', '', 'gi'),
           '[ \t]{2,}', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.trg_apply_ai_real_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
  v_current text;
BEGIN
  IF NEW.content IS NULL OR position('NOME_REAL' in upper(NEW.content)) = 0 THEN
    RETURN NEW;
  END IF;

  v_name := public.extract_ai_real_name(NEW.content);
  NEW.content := public.strip_ai_name_marker(NEW.content);

  IF v_name IS NOT NULL AND NEW.contact_id IS NOT NULL THEN
    SELECT name INTO v_current FROM public.contacts WHERE id = NEW.contact_id;

    IF v_current IS NULL OR lower(btrim(v_current)) <> lower(v_name) THEN
      UPDATE public.contacts
         SET name = v_name, updated_at = now()
       WHERE id = NEW.contact_id;

      INSERT INTO public.activity_logs (user_id, company_id, contact_id, conversation_id, action, details)
      VALUES (
        NEW.user_id,
        NEW.company_id,
        NEW.contact_id,
        NEW.conversation_id,
        'contact_name_ai_updated',
        jsonb_build_object('previous_name', v_current, 'new_name', v_name, 'source', 'ai_marker')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_apply_ai_real_name ON public.messages;
CREATE TRIGGER messages_apply_ai_real_name
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.trg_apply_ai_real_name();