

## Plano: Ordenar mensagens por `sent_at` (timestamp real do WhatsApp)

### Problema
O N8N processa a resposta da IA antes de fazer o upsert da mensagem inbound original. Como o `created_at` reflete o momento da inserção no banco (não o timestamp real do WhatsApp), as mensagens ficam fora de ordem no chat.

### Solução
Adicionar coluna `sent_at` na tabela `messages`, preenchê-la no webhook, e ordenar o chat por ela.

### Etapas

**1. Migration: adicionar coluna `sent_at` à tabela `messages`**
```sql
ALTER TABLE public.messages
  ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;

-- Preencher registros existentes com created_at como fallback
UPDATE public.messages SET sent_at = created_at WHERE sent_at IS NULL;
```

**2. Edge Function `webhook-n8n-instance`**
- No bloco `upsert_message`, ao inserir/atualizar mensagens, gravar `sent_at` com o valor recebido do payload (ou `new Date().toISOString()` como fallback)

**3. Frontend `useMessages.ts`**
- Alterar a query para ordenar por `sent_at` em vez de `created_at`:
```typescript
.order("sent_at", { ascending: true })
```

**4. Frontend `useConversations.ts`**
- Sem alteração necessária (já ordena conversas por `last_message_at`)

### Arquivos modificados
- Nova migration SQL
- `supabase/functions/webhook-n8n-instance/index.ts` — gravar `sent_at`
- `src/hooks/useMessages.ts` — ordenar por `sent_at`

