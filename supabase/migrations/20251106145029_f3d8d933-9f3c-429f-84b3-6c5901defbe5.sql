-- Alter whatsapp_integrations table to have separate credential fields
ALTER TABLE whatsapp_integrations 
  DROP COLUMN credentials,
  ADD COLUMN access_token TEXT,
  ADD COLUMN phone_number_id TEXT,
  ADD COLUMN business_id TEXT,
  ADD COLUMN instance_id TEXT,
  ADD COLUMN api_token TEXT,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected'));

-- Add unique constraint to ensure one integration per user
ALTER TABLE whatsapp_integrations
  ADD CONSTRAINT unique_user_integration UNIQUE (user_id);

-- Create incoming_messages table for webhook events
CREATE TABLE IF NOT EXISTS incoming_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'zapi')),
  from_phone TEXT NOT NULL,
  message_text TEXT,
  message_type TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on incoming_messages
ALTER TABLE incoming_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for incoming_messages
CREATE POLICY "Users can view their own incoming messages"
  ON incoming_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert incoming messages"
  ON incoming_messages FOR INSERT
  WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_incoming_messages_user_id ON incoming_messages(user_id);
CREATE INDEX idx_incoming_messages_from_phone ON incoming_messages(from_phone);