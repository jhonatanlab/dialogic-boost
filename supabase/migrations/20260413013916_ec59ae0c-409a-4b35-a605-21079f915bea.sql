
-- Drop existing policies first
DROP POLICY IF EXISTS "Company members can delete ai_control" ON ai_control;
DROP POLICY IF EXISTS "Company members can insert ai_control" ON ai_control;
DROP POLICY IF EXISTS "Company members can update ai_control" ON ai_control;
DROP POLICY IF EXISTS "Company members can view ai_control" ON ai_control;

-- Create a single permissive policy for all operations
CREATE POLICY "allow_all_ai_control" ON ai_control
FOR ALL
USING (true)
WITH CHECK (true);
