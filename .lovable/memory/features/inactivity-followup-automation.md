---
name: Inactivity Follow-up Automation
description: Automações com trigger_type='inactivity' disparam follow-ups quando contato fica sem responder por tempo configurável
type: feature
---

O sistema suporta automações de follow-up por inatividade:

- `trigger_type = 'inactivity'` na tabela `automations`
- `inactivity_minutes` (int) define o tempo sem resposta inbound para disparar
- `max_followups` (int, default 1) limita quantos follow-ups por conversa
- Tabela `automation_followups` rastreia contagem e último envio por (automation_id, conversation_id)
- Edge Function `process-inactivity-followups` executa via pg_cron a cada 2 minutos

Regras de elegibilidade:
- Somente conversas com `status = 'open'` e `assigned_to IS NULL` (sem atendente)
- Ignora conversas cuja última mensagem inbound é anterior ao `created_at` da automação
- Cooldown cross-automação: se qualquer follow-up foi enviado para a conversa nas últimas 24h, pula
- Cooldown per-automação: não re-dispara se o último follow-up foi dentro da janela de inatividade
- Limite de 50 conversas por automação por execução
