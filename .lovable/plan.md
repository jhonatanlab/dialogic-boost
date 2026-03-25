

## Plano: Limpar ghosts e tornar o sistema resiliente a IDs divergentes

### Problema confirmado nos dados
Cada mensagem gera DUAS linhas no banco:
- Shell `cmn...` (vazia, pending_content: true) — criada por `update_message_status`
- Real `3EB...` (com conteúdo) — criada por `upsert_message`

A reconciliação otimista também falha porque para mídia, o content real é "Mídia enviada" e o otimista é vazio.

### Mudanças

**1. Migração SQL — Limpar dados antigos**
- Deletar todas as shells pendentes: `DELETE FROM messages WHERE content = '' AND metadata->>'pending_content' = 'true'`
- Deletar shells antigas sem conteúdo e sem metadata: `DELETE FROM messages WHERE content = '' AND metadata IS NULL AND direction = 'outbound'`
- Deletar registros com `message_id` prefixo `app-` (legado do frontend que salvava no banco): `DELETE FROM messages WHERE message_id LIKE 'app-%'`

**2. Edge Function `webhook-n8n-instance` — Defesa contra shells inúteis**
- No `update_message_status`: se não encontrar a mensagem pelo `message_id`, **NÃO criar shell**. Apenas retornar `status_deferred` com 200 OK.
- Justificativa: se o n8n vai ser corrigido para enviar o ID oficial correto, as shells pendentes não são mais necessárias. E mesmo que o status chegue antes do conteúdo, o `upsert_message` criará a linha completa e o próximo `update_message_status` com o mesmo ID encontrará a linha.
- Remover toda a lógica de criação de shell (linhas ~247-283).

**3. Frontend `Inbox.tsx` — Melhorar reconciliação otimista**
- Na função `optimisticMatchesReal`: para mensagens de mídia (não-text), não comparar content — apenas comparar `message_type` e janela temporal.
- Manter o filtro `isPendingShell` como segurança extra.

**4. Frontend `useConversations.ts` — Já está ok**
- A lógica de preview já ignora shells. Sem mudança necessária.

### Detalhes técnicos

Arquivos afetados:
- `supabase/functions/webhook-n8n-instance/index.ts` — Simplificar `update_message_status` removendo criação de shell
- `src/pages/Inbox.tsx` — Ajustar `optimisticMatchesReal` para mídia
- Nova migração SQL — Limpeza de dados

A mudança principal é **parar de criar shells no backend**. Se o status chegar antes da mensagem, ele será simplesmente ignorado (deferred). Quando o `upsert_message` criar a linha completa, os próximos status updates encontrarão a linha pelo `message_id` oficial e atualizarão normalmente.

