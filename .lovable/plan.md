## Página de Regras de Agendamento

Nova página em **Configurações → Regras de Agendamento** para definir regras que controlam como agendamentos podem ser criados, com padrão por empresa e override opcional por usuário.

### 1. Banco de dados

Tabela `appointment_rules` (uma linha por empresa quando `user_id IS NULL`, ou uma linha por usuário para override):

- `company_id` (uuid, obrigatório)
- `user_id` (uuid, nulo = padrão da empresa)
- `min_duration_minutes` (int, default 15) — tempo mínimo
- `max_duration_minutes` (int, default 240) — tempo máximo
- `buffer_minutes` (int, default 0) — pausa obrigatória entre agendamentos
- `max_per_day` (int, nulo = sem limite) — total de agendamentos por dia
- `max_per_slot` (int, default 1) — quantos agendamentos simultâneos no mesmo horário (limite global)
- `allow_repeat_same_slot` (bool, default false) — atalho para `max_per_slot > 1`
- `weekly_schedule` (jsonb) — janelas por dia da semana, ex:
  ```
  { "mon": [{"start":"08:00","end":"18:00"}], "tue": [...], "sun": [] }
  ```
- Constraint única: `(company_id, user_id)` (com `user_id` nulo para o padrão)
- RLS por `company_id`; GRANTs para `authenticated` e `service_role`

Função `public.resolve_appointment_rules(p_company_id, p_user_id)` (security definer) que devolve a linha do usuário se existir, senão a da empresa, senão defaults.

**Validação no backend** via trigger `BEFORE INSERT OR UPDATE` em `appointments` que:
1. Resolve as regras para `company_id`/`user_id`.
2. Calcula `end_at = scheduled_at + duration_minutes`.
3. Valida duração mínima/máxima.
4. Valida que o dia da semana e horário caem em alguma janela de `weekly_schedule`.
5. Valida `max_per_day` (conta no mesmo dia, mesmo usuário, status ≠ cancelled).
6. Valida `max_per_slot` (conta sobreposições no mesmo horário no nível da empresa).
7. Valida `buffer_minutes` (nenhum agendamento do mesmo usuário pode terminar/começar dentro do buffer).
8. Lança `RAISE EXCEPTION` com mensagem em português quando viola.

### 2. Frontend

**`src/pages/AppointmentRules.tsx`** (rota `/settings/appointment-rules`):
- Card "Padrão da Empresa" (visível para admin/manager).
- Card "Meu override" (qualquer usuário) — toggle "Usar regras da empresa" vs "Personalizar".
- Campos:
  - Duração mínima/máxima (minutos)
  - Buffer entre agendamentos
  - Total máximo por dia
  - Máximo de agendamentos simultâneos no mesmo horário (com checkbox "Permitir repetir horário" que controla se >1)
  - Grade de 7 dias com toggle ativo/inativo + janela `start`/`end` (botão "+ janela" para múltiplas por dia)
- Salvar via `upsert` em `appointment_rules`.

**`src/hooks/useAppointmentRules.ts`**: hook React Query para ler/escrever (`getCompanyRules`, `getUserRules`, `upsertRules`).

**`src/components/agenda/AppointmentFormDialog.tsx`**: chamar `resolve_appointment_rules` via RPC, validar no submit (mesmas regras), e exibir erros do backend retornados pelo trigger via toast.

**`src/pages/Settings.tsx`**: adicionar card "Regras de Agendamento" apontando para `/settings/appointment-rules` (ícone `CalendarCog`).

**`src/App.tsx`**: registrar a rota.

### Fora do escopo
- Não altera a tabela `appointments` (apenas adiciona trigger).
- Não muda regras de notificação/Google Calendar.
- Não muda permissões existentes (admin/manager edita empresa; agent só edita o próprio override).
