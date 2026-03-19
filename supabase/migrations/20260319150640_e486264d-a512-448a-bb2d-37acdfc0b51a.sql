ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_external_id_unique;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'external_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'message_id'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN external_id TO message_id;
  END IF;
END $$;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_id_unique;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_id_unique UNIQUE (message_id);