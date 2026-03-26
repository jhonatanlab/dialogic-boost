-- Cleanup: copy file_name from temp rows to official rows, then delete orphan temp rows
-- Step 1: For each temp row (client_message_id IS NOT NULL, message_id IS NULL) that has a file_name in metadata,
-- find the official row in the same conversation with matching media_url and copy the file_name
UPDATE messages AS official
SET metadata = jsonb_set(
  COALESCE(official.metadata, '{}'::jsonb),
  '{file_name}',
  temp.metadata->'file_name'
)
FROM messages AS temp
WHERE temp.client_message_id IS NOT NULL
  AND temp.message_id IS NULL
  AND temp.metadata->>'file_name' IS NOT NULL
  AND official.conversation_id = temp.conversation_id
  AND official.direction = temp.direction
  AND official.message_id IS NOT NULL
  AND official.metadata->>'media_url' = temp.metadata->>'media_url'
  AND (official.metadata->>'file_name' IS NULL OR official.metadata->>'file_name' = '');

-- Step 2: Delete orphan temp rows where an official row exists with the same media_url
DELETE FROM messages AS temp
USING messages AS official
WHERE temp.client_message_id IS NOT NULL
  AND temp.message_id IS NULL
  AND temp.metadata->>'media_url' IS NOT NULL
  AND official.conversation_id = temp.conversation_id
  AND official.direction = temp.direction
  AND official.message_id IS NOT NULL
  AND official.metadata->>'media_url' = temp.metadata->>'media_url';