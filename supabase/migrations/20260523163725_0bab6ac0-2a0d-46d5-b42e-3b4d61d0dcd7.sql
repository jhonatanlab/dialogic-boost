
-- 1. Função de normalização
CREATE OR REPLACE FUNCTION public.normalize_br_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_digits text;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;
  v_digits := regexp_replace(p_phone, '\D', '', 'g');
  IF v_digits = '' THEN
    RETURN p_phone;
  END IF;
  -- BR mobile sem o 9: 55 + DDD(2) + 8 dígitos, primeiro local em 6..9
  IF length(v_digits) = 12
     AND substring(v_digits, 1, 2) = '55'
     AND substring(v_digits, 5, 1) IN ('6', '7', '8', '9') THEN
    RETURN substring(v_digits, 1, 4) || '9' || substring(v_digits, 5);
  END IF;
  RETURN v_digits;
END;
$$;

-- 2. Trigger functions
CREATE OR REPLACE FUNCTION public.trg_normalize_contact_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.phone := public.normalize_br_phone(NEW.phone);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_normalize_checkin_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.whatsapp_user := public.normalize_br_phone(NEW.whatsapp_user);
  RETURN NEW;
END;
$$;

-- 3. Triggers
DROP TRIGGER IF EXISTS contacts_normalize_phone ON public.contacts;
CREATE TRIGGER contacts_normalize_phone
  BEFORE INSERT OR UPDATE OF phone ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_contact_phone();

DROP TRIGGER IF EXISTS checkin_records_normalize_phone ON public.checkin_records;
CREATE TRIGGER checkin_records_normalize_phone
  BEFORE INSERT OR UPDATE OF whatsapp_user ON public.checkin_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_checkin_phone();

-- 4. Backfill
UPDATE public.contacts
   SET phone = public.normalize_br_phone(phone)
 WHERE phone IS NOT NULL
   AND phone IS DISTINCT FROM public.normalize_br_phone(phone);

UPDATE public.checkin_records
   SET whatsapp_user = public.normalize_br_phone(whatsapp_user)
 WHERE whatsapp_user IS NOT NULL
   AND whatsapp_user IS DISTINCT FROM public.normalize_br_phone(whatsapp_user);
