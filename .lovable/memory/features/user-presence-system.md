---
name: User Presence System
description: Real-time online tracking via user_presence table with heartbeat, Dashboard card, and Analytics report
type: feature
---
- Table `user_presence` tracks `is_online`, `last_seen_at`, `session_started_at`, `total_online_seconds` per user (UNIQUE on user_id)
- Realtime enabled for live updates
- `usePresence` hook in DashboardLayout: upsert on mount, 60s heartbeat, goOffline on unmount/beforeunload
- Dashboard shows online users card with green dot indicators
- Analytics shows user activity report table with total time online and last seen
