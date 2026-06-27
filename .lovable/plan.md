
## Objetivo
Permitir que o n8n consulte, via HTTP, os horários disponíveis para agendamento respeitando as regras da empresa (ou de um usuário específico).

## Como funcionará

Criar uma **Edge Function** `appointment-availability` que recebe parâmetros e retorna a lista de slots livres dentro das janelas permitidas, já descontando agendamentos existentes, buffers, limite por dia, limite por slot e duração fixa (se ativa).

### Entrada (POST JSON)
```json
{
  "company_id": "uuid",          // obrigatório
  "user_id": "uuid|null",        // opcional, para regras/agenda de um profissional
  "date": "2026-06-25",          // dia a consultar (timezone da empresa)
  "duration_minutes": 60,        // opcional; se a regra de duração fixa estiver ativa, é forçado
  "slot_step_minutes": 15        // opcional, default 15 (granularidade da varredura)
}
```

### Saída
```json
{
  "date": "2026-06-25",
  "duration_minutes": 60,
  "fixed_duration_enforced": true,
  "resolved_scope": "user|company|defaults",
  "windows": [{"start":"08:00","end":"18:00"}],
  "slots": [
    {"start":"2026-06-25T08:00:00-03:00","end":"2026-06-25T09:00:00-03:00","available":true},
    {"start":"2026-06-25T08:15:00-03:00","end":"2026-06-25T09:15:00-03:00","available":false,"reason":"slot_full"}
  ],
  "available_slots": ["2026-06-25T08:00:00-03:00", "..."]
}
```

### Autenticação
Header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` (mesmo padrão já usado pelo n8n no projeto). A função valida o header e rejeita sem ele. Sem JWT do usuário final.

### Lógica interna
1. Carrega regras via `resolve_appointment_rules(company_id, user_id)`.
2. Se `fixed_duration_enabled`, sobrescreve `duration_minutes`.
3. Para o dia solicitado, lê `weekly_schedule[dow]` → janelas permitidas.
4. Gera candidatos a cada `slot_step_minutes` dentro de cada janela onde `slot+duration <= window.end`.
5. Para cada candidato, chama `simulate_appointment_rules(company_id, user_id, slot_start, duration)` e marca `available` conforme `ok`. O motivo da indisponibilidade vem do primeiro check com `ok:false`.
6. Retorna lista completa + atalho `available_slots` só com os livres.

Reaproveitar `simulate_appointment_rules` garante que a verificação é idêntica à do frontend e do trigger no banco — uma única fonte de verdade.

## Como o n8n usa

Node **HTTP Request**:
- Method: POST
- URL: `https://<project>.functions.supabase.co/appointment-availability`
- Headers: `Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`, `Content-Type: application/json`
- Body: JSON com `company_id`, `date`, opcionalmente `user_id` e `duration_minutes`.

Resposta traz `available_slots` pronto para listar ao cliente no WhatsApp.

## Arquivos
- **Novo**: `supabase/functions/appointment-availability/index.ts` — endpoint descrito acima, com CORS e validação Zod.
- **Sem migration** — usa funções SQL já existentes (`resolve_appointment_rules`, `simulate_appointment_rules`).

## Não incluído (posso adicionar depois se quiser)
- Consulta por intervalo de vários dias (`date_from`/`date_to`).
- Endpoint para criar o agendamento direto pelo n8n (hoje seria via REST do PostgREST + trigger de validação).
