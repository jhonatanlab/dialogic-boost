## Problema

A tabela `user_presence` mostra usuários como `is_online=true` indefinidamente. Exemplos da empresa `8559e919-...`:

- **Danilo** — online, `last_seen_at` = 27/abr (13 dias atrás)
- **Igor** — online, `last_seen_at` = 04/mai (6 dias atrás)
- **Maria Fernanda** — online, `last_seen_at` = 04/mai
- **Elizangela** — online, `last_seen_at` = 08/mai

E o `total_online_seconds` está inconsistente — Igor tem 52 s acumulados em semanas e Kaique tem 28 h.

### Causa raiz

`usePresence.ts` faz upsert com `is_online=true` e bate heartbeat de 60 s. O retorno para offline depende de:

1. **`goOffline()` no unmount do React** — só roda em SPA navigation, não em fechar aba/PC.
2. **`navigator.sendBeacon` no `beforeunload`** — chama `PATCH /rest/v1/user_presence` **sem `apikey` nem `Authorization`** (sendBeacon não permite headers). O Supabase rejeita silenciosamente, então a flag `is_online` nunca volta para `false` quando o usuário fecha o navegador, perde conexão, hiberna a máquina, etc.
3. **`total_online_seconds` só incrementa em `goOffline()`** — sessão perdida = tempo perdido.

Resultado: dashboards mentem.

## Plano

### 1. Sweeper no banco (fonte da verdade)

Criar função `public.sweep_stale_presence()` que:

- Para cada linha com `is_online = true` **E** `last_seen_at < now() - interval '3 minutes'`:
  - `total_online_seconds = total_online_seconds + EXTRACT(EPOCH FROM (last_seen_at - session_started_at))` (só conta o que de fato esteve ativo, não o tempo até "expirar")
  - `is_online = false`
  - `session_started_at = NULL`

Agendar via `pg_cron` a cada 1 minuto (já temos `pg_cron` ativo para campanhas).

Isso garante que mesmo sem cooperação do cliente, o estado fica correto e o tempo total reflete só atividade real (até o último heartbeat).

### 2. Edge Function para offline confiável

Trocar o `sendBeacon` direto na REST por uma chamada para uma edge function `presence-offline` (sem JWT, recebe `user_id` no body), que com `service_role` faz o update e contabiliza o `total_online_seconds` corretamente. `sendBeacon` consegue chamar uma edge function pública.

### 3. UI: tratar como offline qualquer presença obsoleta

Defesa em profundidade no caso do sweeper atrasar:

- **Dashboard** (`src/pages/Dashboard.tsx`): mudar a query de `is_online=true` para `is_online=true AND last_seen_at >= now() - 3 min`. Como filtro temporal no PostgREST não tem `now()`, calcular o threshold no client (`new Date(Date.now() - 3*60*1000).toISOString()`).
- **Analytics** (`src/pages/Analytics.tsx`): derivar `effectiveOnline = is_online && last_seen_at > now-3min` e usar em lugar de `u.is_online` para o badge verde.

### 4. Limpeza única dos dados atuais

Após criar o sweeper, rodar uma vez para zerar os fantasmas existentes (Danilo, Igor, Maria Fernanda, Elizangela e qualquer outro de outras empresas).

## Detalhes técnicos

```text
sweep_stale_presence()
  └─ pg_cron: */1 * * * *

beforeunload (browser fecha)
  └─ navigator.sendBeacon → /functions/v1/presence-offline
       └─ service_role: total += last_seen - session_start; is_online=false

usePresence (mantém igual)
  ├─ goOnline (upsert)
  ├─ heartbeat 60s
  └─ goOffline (unmount SPA — continua útil)
```

## Arquivos afetados

- `supabase/migrations/...` — função `sweep_stale_presence` + agendamento `pg_cron`
- `supabase/functions/presence-offline/index.ts` — nova edge function
- `src/hooks/usePresence.ts` — `sendBeacon` aponta para a edge function
- `src/pages/Dashboard.tsx` — filtro de online com janela de 3 min
- `src/pages/Analytics.tsx` — badge online derivado da janela de 3 min
- Limpeza de dados via `supabase--insert` (UPDATE) após o sweeper existir
