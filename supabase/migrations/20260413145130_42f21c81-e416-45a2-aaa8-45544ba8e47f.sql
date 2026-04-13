
-- Function: recalculate last_message_at from actual message timestamps
CREATE OR REPLACE FUNCTION public.refresh_conversation_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_ts timestamptz;
BEGIN
  SELECT max(coalesce(sent_at, created_at))
    INTO v_max_ts
    FROM public.messages
   WHERE conversation_id = NEW.conversation_id;

  IF v_max_ts IS NOT NULL THEN
    UPDATE public.conversations
       SET last_message_at = v_max_ts
     WHERE id = NEW.conversation_id
       AND last_message_at IS DISTINCT FROM v_max_ts;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on INSERT and UPDATE of messages
CREATE TRIGGER trg_refresh_conversation_last_message_at
AFTER INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.refresh_conversation_last_message_at();

-- Backfill: fix any existing inconsistencies
UPDATE public.conversations c
SET last_message_at = sub.max_ts
FROM (
  SELECT conversation_id, max(coalesce(sent_at, created_at)) AS max_ts
  FROM public.messages
  GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id
  AND c.last_message_at IS DISTINCT FROM sub.max_ts;
