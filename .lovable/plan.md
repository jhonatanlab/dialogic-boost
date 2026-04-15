

## Diagnosis: Ghost Conversations with Empty Placeholder Messages

The webhook `webhook-n8n-instance` receives `update_message_status` events (sent/delivered/read) before the actual message content arrives via `upsert_message`. The `update_message_status` handler creates a conversation (via `findOrCreateConversation`) and inserts a placeholder message with `pending_content: true` and empty content. If the corresponding `upsert_message` never arrives, you get ghost conversations containing only empty shells — showing "Sem mensagens" in the inbox.

## Root Cause

In `supabase/functions/webhook-n8n-instance/index.ts` (line ~527), the `update_message_status` action creates a placeholder shell AND a conversation even when no real message exists yet. This is overly aggressive — status updates should only update existing messages, not create new conversations.

## Plan

### 1. Fix `update_message_status` to not create conversations

**File: `supabase/functions/webhook-n8n-instance/index.ts`**

- Change the logic so that when `update_message_status` cannot find an existing message by `message_id`, it does NOT call `findOrCreateConversation` and does NOT create a placeholder shell
- Instead, it should return a "deferred" response — the message content will arrive later via `upsert_message` which will properly create the conversation
- Specifically: remove/skip the "Last resort: create placeholder shell" block (lines ~527-547) and return a deferred response instead

### 2. Clean up existing ghost conversations

**Database migration:**

- Delete messages where `metadata->>'pending_content' = 'true'` AND content is empty
- Delete conversations that have zero remaining messages after cleanup

### Technical Details

The key change is in the `update_message_status` action handler. Currently it flows:
1. Try to find message by `message_id` → not found
2. Try to resolve contact/conversation → creates conversation if needed
3. Create placeholder shell with `pending_content: true`

After fix:
1. Try to find message by `message_id` → not found
2. Return `{ success: true, action: "status_deferred" }` — do not create anything

This is safe because the actual `upsert_message` action handles conversation and contact creation properly with real content.

