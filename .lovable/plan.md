

## Implementar Automação de Follow-up por Inatividade

### Visão Geral
Adicionar a capacidade de criar automações que disparam automaticamente quando um contato fica sem responder por um tempo configurável (ex: 30 minutos, 1 hora, 24 horas).

### 1. Novo tipo de gatilho "Inatividade" no Flow Builder

**Arquivos**: `FlowSidebar.tsx`, `NodeConfigPanel.tsx`, `TriggerNode.tsx`, `FlowBuilder.tsx`

- Adicionar opção `inactivity` no seletor de tipo de gatilho (Trigger Node)
- Campos de configuração: tempo de inatividade (número + unidade: minutos/horas/dias) e número máximo de follow-ups
- Exibir no nó visual: "Sem resposta há X minutos"

### 2. Colunas na tabela `automations`

**Migração SQL**

Adicionar colunas para automações de inatividade:
- `inactivity_minutes` (integer, default null) -- tempo em minutos para considerar inativo
- `max_followups` (integer, default 1) -- limite de follow-ups por conversa

### 3. Tabela de controle de follow-ups

**Migração SQL**

Criar tabela `automation_followups` para rastrear envios e evitar duplicatas:
- `id`, `automation_id`, `conversation_id`, `contact_id`, `company_id`
- `followup_count` (integer) -- quantos follow-ups já foram enviados
- `last_followup_at` (timestamptz) -- quando foi o último
- `created_at`
- Unique constraint em `(automation_id, conversation_id)`
- RLS por `company_id`

### 4. Edge Function: `process-inactivity-followups`

**Arquivo**: `supabase/functions/process-inactivity-followups/index.ts`

Worker que:
1. Busca automações ativas com `trigger_type = 'inactivity'` e `inactivity_minutes IS NOT NULL`
2. Para cada automação, busca conversas da empresa com status `open` ou `in_progress`
3. Verifica a última mensagem `inbound` de cada conversa
4. Se `now() - last_inbound_at >= inactivity_minutes` E `followup_count < max_followups`:
   - Chama `execute-automation` para disparar o fluxo
   - Incrementa `followup_count` na tabela de controle
5. Segurança: usa Service Role Key, valida timestamps

### 5. Cron Job para execução periódica

**SQL (via insert tool, não migração)**

Agendar `pg_cron` para chamar o worker a cada 2 minutos:
```
cron.schedule('process-inactivity-followups', '*/2 * * * *', ...)
```

### 6. Atualizar `useAutomations.ts`

Incluir os novos campos (`inactivity_minutes`, `max_followups`) no tipo `Automation` e nas mutations de criação/atualização.

### 7. UI do painel de configuração

No `NodeConfigPanel`, quando `triggerType === 'inactivity'`:
- Campo numérico para tempo de inatividade
- Seletor de unidade (minutos, horas, dias)
- Campo para máximo de follow-ups (padrão: 1)

### Detalhes Técnicos

- O `pending_at` e `pending_token` já existem na tabela `conversations` e podem ser aproveitados para marcar o início da espera
- O worker respeita o limite de 50 conversas por automação por execução para evitar sobrecarga
- Cada follow-up é registrado com timestamp para permitir intervalos progressivos futuros
- A Edge Function `execute-automation` existente não precisa de alteração -- o worker apenas a invoca com os mesmos parâmetros

