-- Step 0: Drop the existing constraint that's blocking our cleanup
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_contact_id_channel_key;

-- Step 1: Normalize phone values
UPDATE contacts
SET phone = regexp_replace(split_part(phone, ':', 1), '[^0-9]', '', 'g')
WHERE phone IS NOT NULL AND phone != regexp_replace(split_part(phone, ':', 1), '[^0-9]', '', 'g');

-- Step 2: Build contact dedup mapping
CREATE TEMP TABLE contact_dedup_map AS
WITH ranked AS (
  SELECT id, phone, company_id, user_id,
    ROW_NUMBER() OVER (PARTITION BY phone, company_id ORDER BY created_at ASC) AS rn
  FROM contacts
  WHERE phone IS NOT NULL AND company_id IS NOT NULL
)
SELECT r1.id AS dup_id, r2.id AS canonical_id
FROM ranked r1
JOIN ranked r2 ON r1.phone = r2.phone AND r1.company_id = r2.company_id AND r2.rn = 1
WHERE r1.rn > 1;

-- Step 3: Remap all references from dup contacts to canonical
UPDATE messages SET contact_id = dm.canonical_id FROM contact_dedup_map dm WHERE messages.contact_id = dm.dup_id;
UPDATE conversations SET contact_id = dm.canonical_id FROM contact_dedup_map dm WHERE conversations.contact_id = dm.dup_id;
UPDATE contact_tags SET contact_id = dm.canonical_id FROM contact_dedup_map dm WHERE contact_tags.contact_id = dm.dup_id;
UPDATE contact_notes SET contact_id = dm.canonical_id FROM contact_dedup_map dm WHERE contact_notes.contact_id = dm.dup_id;
UPDATE contact_custom_fields SET contact_id = dm.canonical_id FROM contact_dedup_map dm WHERE contact_custom_fields.contact_id = dm.dup_id;
UPDATE fidelity_cards SET contact_id = dm.canonical_id FROM contact_dedup_map dm WHERE fidelity_cards.contact_id = dm.dup_id;
UPDATE checkin_records SET contact_id = dm.canonical_id FROM contact_dedup_map dm WHERE checkin_records.contact_id = dm.dup_id;

-- Step 4: Delete duplicate contacts
DELETE FROM contacts WHERE id IN (SELECT dup_id FROM contact_dedup_map);

-- Step 5: Now consolidate duplicate conversations (same contact_id + company_id)
-- Move messages to the oldest conversation in each group
WITH conv_ranked AS (
  SELECT id, contact_id, company_id,
    ROW_NUMBER() OVER (PARTITION BY contact_id, company_id ORDER BY created_at ASC) AS rn
  FROM conversations
  WHERE company_id IS NOT NULL
),
conv_map AS (
  SELECT cr1.id AS dup_id, cr2.id AS canonical_id
  FROM conv_ranked cr1
  JOIN conv_ranked cr2 ON cr1.contact_id = cr2.contact_id AND cr1.company_id = cr2.company_id AND cr2.rn = 1
  WHERE cr1.rn > 1
)
UPDATE messages m
SET conversation_id = cm.canonical_id
FROM conv_map cm
WHERE m.conversation_id = cm.dup_id;

-- Delete duplicate conversations
WITH conv_ranked AS (
  SELECT id, contact_id, company_id,
    ROW_NUMBER() OVER (PARTITION BY contact_id, company_id ORDER BY created_at ASC) AS rn
  FROM conversations
  WHERE company_id IS NOT NULL
)
DELETE FROM conversations WHERE id IN (
  SELECT id FROM conv_ranked WHERE rn > 1
);

-- Step 6: Add unique indexes to prevent future duplicates
DROP TABLE IF EXISTS contact_dedup_map;

CREATE UNIQUE INDEX IF NOT EXISTS contacts_phone_company_unique 
ON contacts (phone, company_id) 
WHERE phone IS NOT NULL AND company_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_contact_company_unique 
ON conversations (contact_id, company_id) 
WHERE company_id IS NOT NULL;