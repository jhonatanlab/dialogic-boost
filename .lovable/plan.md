

## Plan: Role-Based Menu Visibility

### Goal
Hide Automações, Campanhas, Relatórios, and Check-in from users with `agent` role. Only `admin`, `manager` (and implicitly `proprietário` = admin) can see these pages.

### Changes

**1. `src/components/layout/AppSidebar.tsx`**
- Import and use `useCompany` hook to get the user's `profile.role`
- Add a `requiredRoles` property to restricted menu items (`/automations`, `/campaigns`, `/analytics`, `/checkin`)
- Filter `menuItems` before rendering: if `requiredRoles` is set, only show if user's role is in that list

**2. Route protection on restricted pages**
- In each of the 4 pages (`Automations.tsx`, `Campaigns.tsx`, `Analytics.tsx`, `CheckIn.tsx`), add a role check using `useCompany`
- If the user's role is `agent`, redirect to `/dashboard` (prevents direct URL access)

### Allowed roles for restricted pages
- `admin`, `manager` — can see all 4 pages
- `agent` — cannot see Automações, Campanhas, Relatórios, Check-in

### Technical Details
- The `profiles.role` field stores `admin`, `manager`, or `agent`
- No database changes needed
- The sidebar will dynamically filter items based on the logged-in user's role

