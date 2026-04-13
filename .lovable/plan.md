

## Problema Identificado

A mensagem "Vou te ajudar agora" aparece com X porque:
- O `proxy-n8n` recebeu **404** do endpoint n8n → frontend marcou como `failed`
- O n8n enviou a mensagem por outro caminho e reconciliou o `message_id`
- Mas o status ficou `failed` porque a hierarquia de prioridade bloqueia "rebaixamento" de `failed` para `delivered`/`read`

## Plano de Correção

### 1. Corrigir a hierarquia de status no webhook
**Arquivo**: `supabase/functions/webhook-n8n-instance/index.ts`

Na lógica de `update_message_status`, permitir que status `sent`/`delivered`/`read` sobrescrevam `failed`. A ideia é que se o WhatsApp confirmou entrega, a mensagem não está mais "failed". Ajustar a prioridade: `failed` só deve ser final se não houver confirmação posterior.

### 2. Corrigir a hierarquia no `useMessages.ts` (frontend)
**Arquivo**: `src/hooks/useMessages.ts`

Quando o `proxy-n8n` retorna erro, em vez de marcar imediatamente como `failed`, marcar como `error` ou manter `sending` por um período curto (ex: 30s) para dar tempo ao webhook reconciliar. Alternativa: marcar como `failed` mas permitir que o realtime atualize o status se o webhook trouxer confirmação.

### 3. Atualizar o endpoint do n8n (se necessário)
Verificar no `admin_settings` se o endpoint `n8n_send_message` está correto. O URL atual retorna 404.

### Detalhes Técnicos

**Mudança principal no webhook** (`update_message_status`):
- Alterar a lógica de comparação para que `failed` possa ser sobrescrito por `sent`, `delivered`, `read`, `replied`
- Nova hierarquia: `pending/sending (0) < failed (1) < sent (2) < delivered (3) < read (4) < replied (5) < deleted (6)`
- Isso garante que confirmações reais do WhatsApp sempre prevaleçam sobre erros temporários de rede

**Mudança no frontend** (`useMessages.ts`):
- Após erro do `proxy-n8n`, marcar como `failed` normalmente (sem mudança)
- O realtime já escuta updates, então quando o webhook corrigir o status, o UI vai refletir automaticamente

**Arquivos modificados**:
- `supabase/functions/webhook-n8n-instance/index.ts` — ajustar hierarquia de status
- Opcionalmente: migration SQL se a lógica de prioridade estiver na função `update_campaign_contact_status`

