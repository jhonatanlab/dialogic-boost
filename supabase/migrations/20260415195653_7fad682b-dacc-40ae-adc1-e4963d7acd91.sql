
-- Clean up ghost placeholder messages (pending_content = true, empty content)
DELETE FROM public.messages
WHERE content = ''
  AND metadata->>'pending_content' = 'true';

-- Clean up conversations that have zero remaining messages
DELETE FROM public.conversations
WHERE id NOT IN (SELECT DISTINCT conversation_id FROM public.messages);
