

## Root Cause Analysis

The duplicate conversations are caused by **inconsistent phone number formats**. The Evolution API/n8n sends phone numbers with a device suffix like `558791320676:38`, but the `normalizePhone` function strips all non-digits, turning it into `55879132067638` — which doesn't match the existing contact stored as `558791320676:38` or `558791320676`. So every webhook creates a new contact and a new conversation.

**Evidence from the database:**
- Contact "Jhonatan França" has **6 duplicate entries** with phones `558791320676:38` and `558791320676`
- Contact "GDO - Gleyson de Jesus" has **5 duplicate entries** with phones `5511957757341` and `5511957757341:38`

---

## Plan

### Step 1: Fix phone normalization in Edge Function

Update `normalizePhone` in `webhook-n8n-instance/index.ts` to:
1. Strip the `:XX` suffix first (Evolution API device/instance identifier)
2. Then strip any remaining non-digit characters

```text
"558791320676:38" → "558791320676"
"5511957757341"   → "5511957757341"
"+55 87 9132-0676" → "5587913206760"
```

### Step 2: Consolidate duplicate contacts and conversations (migration)

Write a data cleanup migration that:
1. For each group of duplicate contacts (same phone digits + company_id):
   - Keep the **oldest** contact
   - Update all `messages.contact_id` and `conversations.contact_id` to point to the kept contact
   - Delete the duplicate contacts
2. For each group of duplicate conversations (same contact_id + company_id):
   - Keep the **oldest** conversation
   - Move all messages from duplicates into the kept conversation
   - Delete the duplicate conversations
3. Normalize all existing `contacts.phone` values to digits-only (strip `:XX` suffixes)

### Step 3: Add unique constraint on contacts

After cleanup, add a unique constraint `UNIQUE(phone, company_id)` on the contacts table (using a normalized phone column or a partial index on digits-only) to prevent future duplicates at the database level.

### Step 4: Update Edge Function contact lookup

Change the contact lookup query to use a LIKE/similarity match that handles both `558791320676` and `558791320676:38`, or ensure the phone is always stored normalized (digits-only) and looked up the same way.

---

### Technical Details

**Files to modify:**
- `supabase/functions/webhook-n8n-instance/index.ts` — fix `normalizePhone`, ensure contact lookup uses normalized phone
- New migration SQL — cleanup duplicates, normalize phones, add unique constraint

**Data cleanup SQL outline:**
```text
1. Create temp table mapping duplicate contact IDs → canonical contact ID
2. UPDATE messages SET contact_id = canonical WHERE contact_id IN (duplicates)
3. UPDATE conversations SET contact_id = canonical WHERE contact_id IN (duplicates)  
4. DELETE duplicate contacts
5. Repeat similar logic for duplicate conversations
6. Normalize all phone values (strip :XX suffix)
7. ADD UNIQUE constraint on (phone, company_id) with a WHERE phone IS NOT NULL
```

