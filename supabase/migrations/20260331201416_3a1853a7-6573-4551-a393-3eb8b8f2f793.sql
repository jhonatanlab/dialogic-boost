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
  priority_map jsonb := '{"pending":0,"sent":1,"delivered":2,"read":3,"replied":4,"failed":5}';
  current_priority int;
  new_priority int;
BEGIN
  new_priority := COALESCE((priority_map ->> p_new_status)::int, -1);
  IF new_priority < 0 THEN RETURN; END IF;

  SELECT COALESCE((priority_map ->> status)::int, -1) INTO current_priority
  FROM campaign_contacts
  WHERE campaign_id = p_campaign_id AND contact_id = p_contact_id;

  IF current_priority IS NULL THEN RETURN; END IF;

  IF new_priority > current_priority THEN
    UPDATE campaign_contacts 
    SET status = p_new_status
    WHERE campaign_id = p_campaign_id AND contact_id = p_contact_id;
  END IF;
END;
$$;