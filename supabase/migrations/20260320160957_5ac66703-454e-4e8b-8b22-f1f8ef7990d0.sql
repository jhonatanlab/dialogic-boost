ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_status_check 
CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed', 'received', 'server_ack'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instances;