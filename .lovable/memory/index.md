# Project Memory

## Core
Multi-tenant SaaS (EloChat). Strict PostgreSQL RLS by `company_id`.
Roles: admin, manager, agent. Avoid generic public access.
Tech: Supabase (Edge Functions, Realtime, Storage), React, n8n.
Design: Ciano (#00D4D4) primary, Navy (#0C1A3B) bg. 12px cards, 8px buttons.
Security: Only fix 'error' level scan vulnerabilities.
Constraint: Pages 'Processar Check-in' and 'IA' are permanently removed. Do not re-add.
Edge Functions: `req.text()` fallback to sanitize `\n`, `\r`, `\t` before parsing JSON.

## Memories
- [Platform Overview](mem://project/platform-overview) — EloChat SaaS features, Supabase stack, CNPJ requirement
- [Message Templates](mem://features/message-templates-central-concept) — Variables, types, and context preservation
- [Navigation Origin Tracking](mem://ux/navigation-session-origin-tracking) — Use `sessionStorage.origin` to avoid hard redirects
- [CRM Contact Management](mem://features/crm-contact-management) — Unique constraints, CSV import mapping, phone normalization
- [Campaign Module Architecture](mem://features/campaign-module-architecture) — Base64 media, 24h response window, constraints
- [Realtime Updates](mem://architecture/realtime-updates-strategy) — Supabase subscriptions for inbox/campaigns, unmount cleanup
- [Edge Functions Security](mem://architecture/edge-functions-security-pattern) — Layered auth: JWT for frontend, secret headers for webhooks
- [Visual Flow Builder](mem://features/automation-visual-flow-builder) — Node execution logic, triggers, and JSONB persistence
- [N8N Orchestration](mem://architecture/admin-saas-n8n-orchestration) — WhatsApp hub, delete instances via proxy
- [WhatsApp Provisioning](mem://architecture/whatsapp-provisioning-flow) — Async lifecycle, n8n webhook payload mapping
- [QR Code Generation](mem://features/whatsapp-qr-code-generation) — Native API base64 handling and Realtime success detection
- [React Runtime Singleton](mem://architecture/react-runtime-singleton-enforcement) — Vite dedupe config to prevent Invalid Hook Call
- [Request Parsing Pattern](mem://architecture/edge-function-request-parsing-pattern) — Resilience against malformed webhook JSONs
- [N8N CORS Proxy](mem://architecture/n8n-cors-proxy-strategy) — SSRF allowlist and dynamic endpoint resolution
- [Role-Based Access Control](mem://features/role-based-access-control) — Admin, manager, agent permissions and RLS
- [Inbox Quick Replies](mem://features/inbox-quick-replies-integration) — Dynamic variable injection ({nome}, etc.) for agents
- [Chat Attachments Storage](mem://architecture/storage-chat-attachments) — Filename timestamp prefixing to preserve extensions
- [WhatsApp Integrations Schema](mem://architecture/whatsapp-integrations-schema) — Relational columns instead of JSONB for Meta/Z-API
- [Conversation List Logic](mem://features/inbox-conversation-list-logic) — Sorting by `last_message_at` trigger, preview filtering
- [Team Channels Access](mem://features/team-access-and-channel-configuration) — Access levels (Todos, Equipe, Atendente) and channels
- [Admin User Provisioning](mem://architecture/admin-user-provisioning-logic) — Atomic creation via `manage-users` edge function
- [Native API Mapping](mem://features/whatsapp-native-api-integration-mapping) — Native and Automation APIs are mutually exclusive
- [Datepicker Localization](mem://ux/datepicker-localization-and-navigation) — pt-BR, dropdowns for DOB to avoid manual swiping
- [N8N Webhook Media](mem://architecture/n8n-webhook-media-mapping) — Metadata merging to preserve `file_name` for attachments
- [Media Render Heuristics](mem://features/heuristica-renderizacao-midia-chat) — Suppress base64 raw text, support media + captions
- [Inbox Voice Recording](mem://features/inbox-voice-recording) — `audio/ogg;codecs=opus`, `ptt: true` payload for native WA audio
- [Security Scan Priority](mem://constraints/security-scan-priority) — Fix 'error' severity only
- [Auto Conversation Distribution](mem://features/automatic-conversation-distribution) — ACD trigger logic (Round Robin, Least Loaded, Hybrid)
- [Conversation Audit History](mem://features/conversation-audit-and-history) — Internal events chronologically merged with messages
- [Inbox Service Gating](mem://features/inbox-service-gating) — Interaction lock on unassigned or closed conversations
- [Scheduled Campaigns Worker](mem://architecture/agendamento-tarefas-automatizadas) — `pg_cron` background worker, 2-second interval
- [Automation Execution Engine](mem://features/automation-execution-engine) — Graph parsing, message delays, routing logic
- [Campaign Scheduling UI](mem://ux/campaign-scheduling-ui) — Date and time input synchronization
- [Admin Settings Resolution](mem://architecture/admin-settings-resolution-pattern) — Lookup cascade: company_id -> user_id -> global
- [Removed Features](mem://project/removed-features) — Deprecated Check-in and IA pages
- [API Endpoints Strategy](mem://architecture/system-api-endpoints-and-terminology) — Edge functions as primary webhooks/API backend
- [Color System](mem://style/color-palette-and-system) — Official tokens and hover states
- [AI Inbox Control](mem://features/automacao-ia-controle-inbox) — `ai_control` managed via REST and Service Role Key
- [AI Summaries & Reopen](mem://features/resumos-ia-e-reabertura-conversa) — Archive summary on close, strip agent on reopen
- [N8N External Auth](mem://security/acesso-direto-api-rest-automacao-pt) — Require Service Role Key for REST queries
- [Webhook Data Cutoff](mem://features/webhook-data-cutoff-pt) — Ignore historical messages before `data_cutoff_timestamp`
- [Message Status Priority](mem://architecture/hierarquia-prioridade-status-mensagens-pt) — pending(0) < failed(1) < sent(2) < delivered(3) < read(4) < replied(5)
- [Inbox Send Reconciliation](mem://features/fluxo-reconciliacao-envio-inbox-pt) — Pre-persist with UUID, reconcile via webhook ID
- [Loyalty Check-in System](mem://features/sistema-fidelidade-checkin-pt) — Service role override for public QR check-ins
- [WhatsApp Providers](mem://features/provedores-integracao-whatsapp-pt) — 4 modes: Meta, Z-API, Native, Automation
- [Multi-tenant Isolation](mem://architecture/isolamento-multi-tenant-pt) — RLS policies on `company_id`
- [Inbox Chronology](mem://features/interface-comportamento-inbox-pt) — Strict ordering by `sent_at`, default `now()`
- [Inbox Conversation Filtering](mem://features/gestao-filtragem-conversas-inbox-pt) — Tabs visibility and RLS isolation
- [Webhook Media Sync Contract](mem://architecture/webhook-media-sync-contract-pt) — Requires `media_url` and `media_type`, no base64 in content
- [N8N API Integration Contract](mem://architecture/contrato-api-integracao-n8n-pt-v2) — Payload actions: Exact, Legacy, Fuzzy matching
- [Outbound Automation Contract](mem://architecture/contrato-payload-automacao-outbound-pt) — Payloads for Pause/Reactivate AI and manual messages
- [Agent Identification Prefix](mem://features/identificacao-atendente-mensagens-pt) — Outbound messages prefixed with `*Name:*\n`
- [Message Formatting Render](mem://architecture/inbox-message-rendering-formatting-pt) — Bold `*text*` formatting in ChatBubble
- [Inactivity Follow-up Automation](mem://features/inactivity-followup-automation) — pg_cron worker triggers follow-ups when contact is inactive
- [User Presence System](mem://features/user-presence-system) — Real-time online tracking, Dashboard card, Analytics activity report
- [Automation Executions Tracking](mem://features/automation-executions-tracking) — `automation_executions` table for granular per-flow metrics
