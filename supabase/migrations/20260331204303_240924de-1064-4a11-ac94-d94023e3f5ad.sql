
-- 1) Drop the old restrictive constraint
ALTER TABLE public.campaign_contacts DROP CONSTRAINT IF EXISTS campaign_contacts_status_check;

-- 2) Add new constraint allowing read and replied
ALTER TABLE public.campaign_contacts ADD CONSTRAINT campaign_contacts_status_check 
  CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed'));

-- 3) Backfill: reconcile campaign_contacts with messages that already have higher status
-- Update to 'read' where the outbound campaign message is already read
UPDATE public.campaign_contacts cc
SET status = 'read'
FROM public.messages m
WHERE m.client_message_id LIKE 'campaign|' || cc.campaign_id::text || '|' || cc.contact_id::text || '%'
  AND m.status = 'read'
  AND cc.status IN ('pending', 'sent', 'delivered');

-- Update to 'delivered' where the outbound campaign message is delivered (and cc is still pending/sent)
UPDATE public.campaign_contacts cc
SET status = 'delivered'
FROM public.messages m
WHERE m.client_message_id LIKE 'campaign|' || cc.campaign_id::text || '|' || cc.contact_id::text || '%'
  AND m.status = 'delivered'
  AND cc.status IN ('pending', 'sent');
