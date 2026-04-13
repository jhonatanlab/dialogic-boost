
## Plano: corrigir a ordenação das conversas no Inbox

### O que verifiquei
- A lista de conversas no frontend usa `useConversations.ts` com `.order("last_message_at", { ascending: false })`.
- No banco, a ordenação atual está correta para as 2 conversas existentes:
  - Hellen: `last_message_at = 2026-04-13 14:19:32.996+00`
  - Jhonatan França: `last_message_at = 2026-04-13 04:56:39.507+00`
- O timestamp real da última mensagem também bate com `last_message_at`, então o problema não parece ser dado corrompido agora.
- A aba atual do Inbox pode filtrar a lista (`mine`, `all`, `queue`, `closed`), então a percepção de “fora de ordem” pode vir da aba/filtro e não do `ORDER BY`.
- Há um ponto frágil no código: `last_message_at` é atualizado em mais de um lugar com `new Date().toISOString()`, enquanto o restante do sistema já usa `sent_at` como horário real da mensagem. Isso pode voltar a causar inconsistência quando mensagens chegam atrasadas, são reconciliadas ou atualizadas por webhook.

### Causa mais provável
A ordenação “voltar a quebrar” não está vindo do select do Inbox, e sim da forma como `last_message_at` é alimentado:
- `src/hooks/useMessages.ts` atualiza a conversa com o horário local do envio
- `supabase/functions/webhook-n8n-instance/index.ts` também atualiza a conversa
- se houver reconciliação, atraso do provedor, mídia, status posterior ou mensagens processadas fora de sequência, `last_message_at` pode ficar desalinhado do timestamp real da última mensagem

### Implementação proposta
1. Remover a dependência de atualizações “manuais” imprecisas de `last_message_at`
   - revisar `useMessages.ts`
   - revisar `webhook-n8n-instance/index.ts`

2. Centralizar a verdade da ordenação
   - fazer `last_message_at` sempre refletir o maior `coalesce(sent_at, created_at)` das mensagens da conversa
   - preferencialmente via lógica no backend/database, não espalhada no frontend

3. Tornar a atualização idempotente
   - evitar sobrescrever `last_message_at` com um timestamp mais novo porém “falso” quando a mensagem real é mais antiga
   - garantir que updates de status não empurrem conversa para o topo sem haver nova mensagem real

4. Ajustar a listagem do Inbox para robustez
   - manter ordenação principal por `last_message_at desc`
   - adicionar fallback determinístico secundário se necessário (ex.: `created_at desc` da conversa) para evitar empate visual

5. Validar o comportamento nas abas
   - confirmar se `mine`, `queue`, `all` e `closed` preservam a ordem já trazida da query
   - testar com novas mensagens inbound, outbound, mídia e reconciliação

### Arquivos que eu alteraria
- `src/hooks/useMessages.ts`
- `supabase/functions/webhook-n8n-instance/index.ts`
- possivelmente uma nova migration para endurecer a regra de `last_message_at` no banco

### Detalhes técnicos
```text
Hoje:
mensagem chega/enviada
  -> código atualiza conversations.last_message_at com now()
  -> isso pode não ser o horário real da mensagem

Proposto:
mensagem criada/reconciliada
  -> usar max(coalesce(messages.sent_at, messages.created_at))
  -> conversations.last_message_at sempre reflete a última mensagem real
```

### Resultado esperado
- conversas não “saltam” de posição incorretamente
- mensagens antigas processadas depois não bagunçam a lista
- mídias e reconciliações não alteram a ordem de forma errada
- Inbox fica consistente com o histórico real do chat
