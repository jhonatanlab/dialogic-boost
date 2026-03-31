CREATE OR REPLACE FUNCTION public.update_campaign_contact_status(
  p_campaign_id uuid,
  p_contact_id uuid,
  p_new_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_status text := lower(trim(coalesce(p_new_status, '')));
BEGIN
  IF normalized_status NOT IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed') THEN
    RETURN;
  END IF;

  UPDATE public.campaign_contacts cc
  SET
    status = normalized_status,
    sent_at = CASE
      WHEN normalized_status IN ('sent', 'delivered', 'read', 'replied') AND cc.sent_at IS NULL THEN now()
      ELSE cc.sent_at
    END
  WHERE cc.campaign_id = p_campaign_id
    AND cc.contact_id = p_contact_id
    AND (
      CASE cc.status
        WHEN 'pending' THEN 0
        WHEN 'sent' THEN 1
        WHEN 'delivered' THEN 2
        WHEN 'read' THEN 3
        WHEN 'replied' THEN 4
        WHEN 'failed' THEN 5
        ELSE -1
      END
    ) < (
      CASE normalized_status
        WHEN 'pending' THEN 0
        WHEN 'sent' THEN 1
        WHEN 'delivered' THEN 2
        WHEN 'read' THEN 3
        WHEN 'replied' THEN 4
        WHEN 'failed' THEN 5
        ELSE -1
      END
    );
END;
$$;