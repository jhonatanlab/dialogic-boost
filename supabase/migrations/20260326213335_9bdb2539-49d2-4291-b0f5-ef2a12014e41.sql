
-- Add client_message_id column for temporary app IDs
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_message_id text;

-- Create unique index on client_message_id (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_message_id_unique ON public.messages (client_message_id) WHERE client_message_id IS NOT NULL;

-- Clean up existing orphan app-xxx records that have a matching 3EB counterpart
DELETE FROM public.messages WHERE id IN (
  SELECT a.id FROM public.messages a
  JOIN public.messages b ON a.conversation_id = b.conversation_id
    AND a.direction = b.direction AND a.content = b.content
  WHERE a.message_id LIKE 'app-%'
    AND b.message_id NOT LIKE 'app-%'
    AND ABS(EXTRACT(EPOCH FROM (a.created_at - b.created_at))) < 60
);

-- Migrate remaining app-xxx records: move their message_id to client_message_id and set message_id to null
UPDATE public.messages 
SET client_message_id = message_id, message_id = NULL 
WHERE message_id LIKE 'app-%';
