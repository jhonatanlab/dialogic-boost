

## Root Cause

Two bugs with the same root cause: **the app inserts outbound messages without a `message_id`**.

1. **Empty bubble**: After sending "Teste", the app inserts a message (no `message_id`). Then n8n/Evolution API sends a webhook `upsert_message` for the same outbound message WITH an Evolution `message_id`. Since no existing message matches that `message_id`, a **second duplicate message** is created — often with empty or different content, causing the empty bubble.

2. **Status never updates**: When Evolution sends `update_message_status` with its `message_id`, the app's original message (which has `message_id = null`) is never found, so status stays at "sending" forever.

## Plan

### Step 1: Generate `message_id` on outbound messages (useMessages.ts)

When inserting an outbound message in `sendMessage`, generate a unique `message_id` (e.g., `app-{uuid}`) and store it in the DB. This gives the message a trackable identifier.

### Step 2: Return `message_id` to n8n in send payload (useMessages.ts)

Include the generated `message_id` in the payload sent to n8n (`proxy-n8n`), so n8n can associate the Evolution API response with our message.

### Step 3: Match outbound duplicates in webhook (webhook-n8n-instance)

In the `upsert_message` action, when receiving an **outbound** message: before inserting, check if there's already an outbound message in the same conversation with matching content and a recent timestamp (within 60 seconds) that has a different or null `message_id`. If found, **update that existing message** (set its `message_id` to the Evolution one + update status) instead of creating a new one.

This handles the case where n8n doesn't pass back our app-generated `message_id`.

### Step 4: Cleanup — remove stale optimistic messages (Inbox.tsx)

Tighten the optimistic cleanup logic to also account for messages with status "sending" that have been in the DB for more than 30 seconds without an update.

### Technical Details

**Files to modify:**
- `src/hooks/useMessages.ts` — add `message_id` generation on insert, include in n8n payload
- `supabase/functions/webhook-n8n-instance/index.ts` — add duplicate-matching logic for outbound messages in `upsert_message`

**Key code change in webhook (upsert_message):**
```text
If direction === "outbound":
  1. Try upsert by message_id (existing logic)
  2. If no existing message found by message_id, look for a recent outbound message
     in the same conversation with matching content and message_id IS NULL
  3. If found, UPDATE that message (set message_id + status) instead of INSERT
```

**Key code change in useMessages.ts:**
```text
const generatedMessageId = `app-${crypto.randomUUID()}`;
// Insert with message_id field
// Include message_id in n8n payload
```

