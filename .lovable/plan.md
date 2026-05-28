## Módulo Agenda — EloChat

Novo módulo de agendamentos com calendário visual (mensal/semanal/diário), CRUD completo e integração opcional com Google Calendar por usuário.

---

## 1. Banco de dados (1 migration)

### Tabela `appointments`
Conforme especificação, com ajustes para o padrão do projeto:
- `company_id`, `contact_id`, `user_id`, `title`, `phone`, `scheduled_at`, `duration_minutes` (default 60), `type` (default `'reuniao'`), `status` (default `'pending'`), `notes`, `google_event_id`, `google_calendar_id`, `created_at`, `updated_at`.
- **GRANTs** para `authenticated` e `service_role`.
- **RLS** isolando por `company_id` via `get_user_company_id()`:
  - SELECT/INSERT/UPDATE: company members
  - DELETE: apenas admin/manager (`has_role`)
- Índice em `(company_id, scheduled_at)` para queries de calendário.
- Trigger `update_updated_at_column`.

### Tabela `google_calendar_tokens`
- Conforme especificação. `user_id` UNIQUE.
- **GRANTs** só para `authenticated` + `service_role` (sem `anon`).
- **RLS**: usuário só vê/edita o **próprio** token (`user_id = auth.uid()`). Service role acesso total (edge functions).
- `access_token` e `refresh_token` ficam no banco protegidos por RLS — só edge functions (service role) leem para chamar a API do Google.

---

## 2. Menu lateral

`src/components/layout/AppSidebar.tsx`: adicionar item **"Agenda"** (`Calendar` do lucide) entre **Campanhas** e **Relatórios**, sem `requiredRoles` (todos os papéis veem).

---

## 3. Rota e página `/agenda`

### `src/App.tsx`
Registrar `<Route path="/agenda" element={<Agenda />} />`.

### `src/pages/Agenda.tsx`
- Header: título "Agenda" + botão "+ Novo Agendamento" (estilo padrão).
- Toggle (Tabs): **Mensal / Semanal / Diária**.
- Renderiza um dos 3 componentes de visualização com os eventos do período visível.
- Botões "anterior / hoje / próximo" e label do período atual.
- Estado vazio: ilustração de calendário + "Nenhum agendamento encontrado. Crie o primeiro!".
- Cores de status: `pending`=azul, `confirmed`=verde, `cancelled`=vermelho (via design tokens).

### Componentes em `src/components/agenda/`
- `AgendaToolbar.tsx` — toggle + navegação de período.
- `MonthView.tsx` — grid 7×N usando `date-fns` (`startOfMonth`/`endOfMonth`/`eachDayOfInterval`). Cada célula lista até 3 eventos (nome do contato + hora) e "+N mais" se exceder.
- `WeekView.tsx` — 7 colunas × horas (8h–20h). Eventos posicionados pelo `scheduled_at` e altura por `duration_minutes`.
- `DayView.tsx` — coluna única, mesmo formato horário.
- `AppointmentBadge.tsx` — bloco do evento (contato, hora, tipo, cor por status). Click abre modal de edição.
- `AppointmentFormDialog.tsx` — Dialog do shadcn com `react-hook-form` + `zod`:
  - Nome do contato (text), Telefone (text), Data (Calendar popover), Hora (input `time`), Tipo (Select com `visita_tecnica`/`reuniao`/`ligacao`/`outro`), Observações (Textarea), **Contato vinculado** (Combobox com busca em `useContacts`; ao escolher, autopreenche nome+telefone).
  - Modo edição: aceita `appointment` prop e mostra botão "Excluir".

---

## 4. Hook `src/hooks/useAppointments.ts`

- `useAppointments(rangeStart, rangeEnd)` — `useQuery` filtrando por `company_id` (via `useCompany`) e `scheduled_at` no range, ordenado por `scheduled_at`. Join com `contacts(name)` para exibir nome.
- `useCreateAppointment()`, `useUpdateAppointment()`, `useDeleteAppointment()` — mutations com `useToast` e `invalidateQueries(["appointments"])`.
- No create/update: se o usuário tiver `google_calendar_tokens` ativo + toggle de sincronização ligado, chama edge function `sync-google-calendar` (não bloqueia o salvamento — fire-and-forget com toast em caso de erro).

---

## 5. Integração Google Calendar

### UI em `src/pages/Profile.tsx` (Configurações → Perfil)
Nova seção **"Google Calendar"**:
- Se não conectado: botão "Conectar Google Calendar" → inicia OAuth.
- Se conectado: mostra email + botão "Desconectar" + toggle "Sincronizar automaticamente novos agendamentos" (persistido em `admin_settings` com `setting_key='google_calendar_autosync'`).

### Hook `src/hooks/useGoogleCalendar.ts`
- `useGoogleCalendarToken()` — query do token do usuário atual.
- `useDisconnectGoogleCalendar()` — deleta o row.
- `useGoogleAutosync()` — lê/escreve toggle em `admin_settings`.

### Edge Functions
**`supabase/functions/google-calendar-oauth/index.ts`** — duas ações via query param `?action=`:
- `authorize`: gera URL de consentimento (`accounts.google.com/o/oauth2/v2/auth`) com `scope=calendar.events`, `access_type=offline`, `prompt=consent` e `state=<user_id>`. Retorna a URL para o frontend redirecionar.
- `callback`: recebe `code` + `state`, troca por tokens, busca email via `https://www.googleapis.com/oauth2/v2/userinfo`, faz `upsert` em `google_calendar_tokens` (service role).
- Usa secrets `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.

**`supabase/functions/sync-google-calendar/index.ts`** — invocada pelas mutations:
- Valida JWT do chamador; pega token do usuário; se expirado, faz refresh.
- Cria/atualiza/deleta evento no `calendars/primary/events`.
- Atualiza `google_event_id` no appointment.

### Pré-requisito de secrets
Antes de fazer a integração funcionar, o usuário precisa fornecer **`GOOGLE_CLIENT_ID`**, **`GOOGLE_CLIENT_SECRET`** e **`GOOGLE_REDIRECT_URI`** (criados no Google Cloud Console, OAuth 2.0 Web Application, escopo `https://www.googleapis.com/auth/calendar.events`, redirect = URL do endpoint `callback` da edge function). O fluxo de pedido dos secrets só será disparado **depois** que o usuário confirmar que quer prosseguir com a parte do Google — a agenda principal funciona normalmente sem isso.

---

## 6. Detalhes técnicos

- **Datas**: `date-fns` (já no projeto) com `ptBR`. Sem instalar bibliotecas pesadas de calendário (FullCalendar/react-big-calendar) — vamos montar as 3 views à mão para manter visual consistente com o tema EloChat.
- **Cores de status**: classes Tailwind via tokens (`bg-blue-500/15 text-blue-600`, etc., no mesmo padrão do `contactSource.ts`).
- **Filtro multi-tenant**: garantido por RLS no banco; queries também filtram por `company_id` explicitamente.
- **Sem alteração** em automações/campanhas/inbox neste escopo.
- **Não inclui** notificações/lembretes (push, email) — pode ser feito em escopo futuro.

---

## Ordem de execução

1. Migration (`appointments` + `google_calendar_tokens` + RLS + grants).
2. `useAppointments.ts` + `AppointmentFormDialog`.
3. Página `Agenda.tsx` com as 3 views.
4. Item no `AppSidebar` + rota no `App.tsx`.
5. Seção Google Calendar em `Profile` + hook + edge functions (após o usuário fornecer os secrets do Google).
