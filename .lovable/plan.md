

## Plano de Implementacao — 5 Funcionalidades

### 1. Modal de Detalhes de Fluxo com Metricas e Filtro por Data

**Arquivo novo**: `src/components/automations/AutomationDetailModal.tsx`

Modal exibido ao clicar em um fluxo na lista de automacoes, contendo:
- Cards de metricas: total de execucoes, taxa de sucesso (enviadas vs falhas), entregues, visualizados, respondidos
- Filtro por periodo (data inicio / data fim)
- Os dados serao buscados da tabela `automation_followups` (agregando por automation_id e filtrando por data)

**Tabela nova (migracao)**: `automation_executions` — para rastrear resultado individual de cada execucao (status: sent/delivered/read/replied/failed), vinculada a `automation_id` e `conversation_id`.

**Arquivo editado**: `src/pages/Automations.tsx` — adicionar estado para automacao selecionada e renderizar o modal.

---

### 2. Enriquecer Lista de Conversas no Inbox

**Arquivo editado**: `src/hooks/useConversations.ts`
- Na query, fazer join com `contact_tags` + `tags` para trazer as etiquetas de cada contato (cores e nomes).
- Ja traz `assigned_agent_name`, `assigned_team_name` e `channel` — garantir que estao expostos.

**Arquivo editado**: `src/pages/Inbox.tsx` (componente `ConversationItem`)
- Abaixo do nome do contato, renderizar bolinhas/badges coloridas com as cores das etiquetas do contato.
- Exibir nome do atendente atribuido (se houver) em texto pequeno.
- Ao lado do nome do contato, adicionar icone do canal (WhatsApp, Instagram, Facebook, etc.) usando icones SVG inline.
- Atualizar o tipo do `ConversationItem` para aceitar `tags`, `assigned_agent_name`, `channel`.

---

### 3. Verificar e Corrigir Disparo de Campanhas

**Arquivo analisado**: `supabase/functions/process-scheduled-campaigns/index.ts`
- A funcao busca `admin_settings` com `setting_key = 'n8n_send_message'` para obter o endpoint de envio. Se nao encontrar, a campanha falha silenciosamente.
- Verificar se a integracao WhatsApp da empresa (tabela `whatsapp_integrations`) esta sendo utilizada como fallback.

**Correcao**: Adicionar fallback na Edge Function para buscar a integracao WhatsApp ativa da empresa (`whatsapp_integrations` com `status = 'connected'`) e usar o endpoint correto do provedor quando `n8n_send_message` nao estiver configurado. Logar erro claro quando nenhum endpoint for encontrado.

**Arquivo editado**: `supabase/functions/process-scheduled-campaigns/index.ts`

---

### 4. Inserir Automacoes de Exemplo em Contas Existentes

**Acao de banco**: Executar INSERT direto na tabela `automations` para cada empresa existente que ainda nao possua os 5 fluxos de exemplo (Boas-Vindas, Follow-Up, Qualificacao de Leads, Respostas FAQ, Triagem).

- Consultar empresas existentes: `SELECT id FROM companies`
- Filtrar empresas que ja tem automacoes de exemplo (pelo nome)
- Inserir os 5 fluxos com `status = 'paused'` para cada empresa faltante, usando o mesmo `flow_data` JSON que o `create-company` ja insere.

---

### 5. Sistema de Presenca Online (Usuarios Ativos)

#### 5.1 Tabela nova (migracao): `user_presence`
```
id uuid PK default gen_random_uuid()
user_id uuid NOT NULL
company_id uuid NOT NULL
is_online boolean NOT NULL default false
last_seen_at timestamptz NOT NULL default now()
session_started_at timestamptz
total_online_seconds bigint default 0
created_at timestamptz default now()
updated_at timestamptz default now()
```
- RLS: usuarios autenticados podem ver registros da propria empresa; podem atualizar o proprio registro.
- Habilitar Realtime nesta tabela.

#### 5.2 Hook: `src/hooks/usePresence.ts`
- No mount, marcar `is_online = true` e `session_started_at = now()`.
- Heartbeat a cada 60 segundos atualizando `last_seen_at`.
- No `beforeunload` / unmount, calcular duracao da sessao e incrementar `total_online_seconds`, setar `is_online = false`.
- Integrar no `DashboardLayout` para estar ativo em todas as paginas.

#### 5.3 Dashboard — Card "Usuarios Online"
**Arquivo editado**: `src/pages/Dashboard.tsx`
- Novo card mostrando lista de usuarios online (nome + indicador verde) em tempo real via Realtime subscription na tabela `user_presence`.

#### 5.4 Relatorios — Tempo de Atividade
**Arquivo editado**: `src/pages/Analytics.tsx` ou nova secao
- Tabela mostrando cada usuario, tempo total online no periodo filtrado, ultima vez visto.
- Dados de `user_presence` agrupados por `user_id`.

### Detalhes Tecnicos

- A migracao de `user_presence` inclui um indice em `(company_id, is_online)` para queries eficientes.
- O heartbeat usa `upsert` com `ON CONFLICT (user_id)` para evitar registros duplicados (constraint UNIQUE em `user_id`).
- A tabela `automation_executions` permite rastrear metricas granulares futuras sem depender apenas de `execution_count`.
- As etiquetas na lista de conversas serao carregadas em batch (uma query para todos os `contact_id` das conversas visibles) para evitar N+1.

