
-- 1. Fix incoming_messages: remove open INSERT, add authenticated-only
DROP POLICY IF EXISTS "Anyone can insert incoming messages" ON incoming_messages;
CREATE POLICY "Authenticated users can insert own incoming messages"
  ON incoming_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Fix checkin_records: restrict INSERT to authenticated users
DROP POLICY IF EXISTS "Anyone can create checkin records" ON checkin_records;
CREATE POLICY "Authenticated users can create checkin records"
  ON checkin_records FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND checkin_link_id IN (SELECT id FROM checkin_links)
  );

-- 3. Fix whatsapp_integrations: restrict all policies to authenticated role
DROP POLICY IF EXISTS "Users can create their own integrations" ON whatsapp_integrations;
DROP POLICY IF EXISTS "Users can delete their own integrations" ON whatsapp_integrations;
DROP POLICY IF EXISTS "Users can update their own integrations" ON whatsapp_integrations;
DROP POLICY IF EXISTS "Users can view their own integrations" ON whatsapp_integrations;

CREATE POLICY "Authenticated users can create their own integrations"
  ON whatsapp_integrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own integrations"
  ON whatsapp_integrations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own integrations"
  ON whatsapp_integrations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view their own integrations"
  ON whatsapp_integrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Fix profiles: restrict INSERT to enforce default role
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile with default role"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'agent');
