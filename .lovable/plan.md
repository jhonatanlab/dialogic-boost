## Objetivo
Permitir configurar, por webhook, o destino padrão dos leads recebidos: uma equipe, um usuário específico ou deixar em aberto.

## Mudanças

### 1. Banco de dados (migração)
Adicionar duas colunas em `webhook_integrations`:
- `default_team_id uuid` (FK → `teams.id`, nullable, `ON DELETE SET NULL`)
- `default_assigned_to uuid` (FK → `auth.users.id`, nullable, `ON DELETE SET NULL`)

Regra: podem ser ambas nulas (= deixar em aberto), uma delas preenchida, ou as duas (equipe + atendente).

### 2. UI — `src/pages/WebhookIntegrations.tsx`
No diálogo de criar/editar webhook, adicionar dois selects abaixo da mensagem de boas-vindas:
- **Equipe padrão** — lista `teams` da empresa + opção "Nenhuma (deixar em aberto)"
- **Atendente padrão** — lista de atendentes da empresa + opção "Nenhum"

Mostrar também na listagem de cada webhook um badge/linha com "Equipe: X · Atendente: Y" quando definidos.

### 3. Hook — `src/hooks/useWebhookIntegrations.ts`
Incluir os dois novos campos no tipo `WebhookIntegration` e nas mutações `create`/`update`.

### 4. Edge function — `supabase/functions/webhook-leads/index.ts`
Ao criar uma nova conversa (bloco `else` na linha ~189), incluir:
```ts
assigned_team: integration.default_team_id ?? null,
assigned_to: integration.default_assigned_to ?? null,
status: integration.default_assigned_to ? "in_progress" : "open",
```
Para conversas já existentes, **não sobrescrever** atribuição atual (respeita o trabalho do atendente).

Também registrar um evento em `conversation_events` (`transferred_team` / `transferred_agent`) quando a atribuição inicial vier do webhook, para manter a auditoria consistente.

## Fora de escopo
- Não altera lógica de distribuição automática (ACD) — se `default_assigned_to` estiver definido no webhook, ele tem prioridade; senão o trigger `distribute_conversation` existente pode agir normalmente quando `status='open'` e `assigned_to IS NULL`.
- Não altera contatos existentes retroativamente.
