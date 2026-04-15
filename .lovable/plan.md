

## Diagnosis: White Screen on Inbox

The `useConversations` hook throws an unhandled error (`"Company not found"`) when the user's profile has no `company_id` or the profile query returns no rows. This crashes the Inbox silently.

## Plan

### 1. Add error handling in `useConversations.ts`
- Replace `throw new Error("Company not found")` with a graceful return of an empty array
- Do the same for the auth check — return empty instead of throwing

### 2. Add error/empty state UI in `Inbox.tsx`
- Show a friendly message when `conversations` is empty or the hook encounters an error
- Display a "No company linked" message if the user has no company association

### 3. Verify database state
- Run a read query to check if `kaique@dlsenergiasolar.com` has a valid `company_id` in their profile
- If not, identify the root cause (missing profile row, null company_id, etc.)

### Technical Details

**File: `src/hooks/useConversations.ts`**
- Change line 50 from `throw new Error("Company not found")` to `return []`
- Change line 41 from `throw new Error("User not authenticated")` to `return []`

**File: `src/pages/Inbox.tsx`**
- Add a check: if `useConversations` returns an error state, show a user-friendly message instead of a blank screen

**Database check:**
- Query `profiles` table for the user's `company_id` to confirm whether the data issue exists

