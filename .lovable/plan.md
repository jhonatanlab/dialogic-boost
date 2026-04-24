

## Plano

### Regra
Encerrar (cancelar) todos os follow-ups de inatividade pendentes de uma conversa quando **AMBAS** as condições forem verdadeiras:
1. Existe um `contact_ai_summaries` para o contato (Resumo IA gerado).
2. A conversa **saiu da fila** — ou seja, tem `assigned_to IS NOT NULL` **ou** `status` diferente de `'open'` (passou para `in_progress`/`closed`).

### Implementação

Alterar o worker `supabase/functions/process-inactivity-followups/index.ts`:

Antes de processar cada conversa elegível, fazer duas verificações adicionais:

1. **Conversa saiu da fila?**  
   O filtro atual já é `status = 'open'` AND `assigned_to IS NULL`, então conversas que saíram da fila já são naturalmente ignoradas pelo worker. Reforço: garantir que o filtro continue assim (sem mudanças).

2. **Existe Resumo IA + conversa fora da fila → marcar followups como encerrados:**  
   Adicionar uma etapa de "limpeza" no início do worker que:
   - Busca todas as conversas da empresa que tenham `automation_followups` ativos.
   - Para cada uma, verifica:
     - Se a conversa está `assigned_to IS NOT NULL` OU `status != 'open'` (saiu da fila), E
     - Existe `contact_ai_summaries` para o `contact_id` daquela conversa.
   - Se ambas verdadeiras, atualiza os registros de `automation_followups` daquela conversa para `followup_count = max_followups` da automação correspondente (efetivamente bloqueando novos disparos).
   - Alternativa mais limpa: adicionar coluna `cancelled_at` em `automation_followups` e setar; o worker passa a ignorar registros com `cancelled_at IS NOT NULL`.

### Abordagem escolhida (mais limpa e auditável)

**Migration de schema:** adicionar coluna `cancelled_at timestamptz` (nullable) na tabela `automation_followups`.

**No worker `process-inactivity-followups`:**
- Etapa 1 (nova, no início): para cada empresa com automações de inatividade ativas, buscar conversas que tenham `automation_followups` com `cancelled_at IS NULL` e que satisfaçam:
  - `(conversations.assigned_to IS NOT NULL OR conversations.status != 'open')`, E
  - existe registro em `contact_ai_summaries` para o `contact_id`.
- Para essas conversas, fazer `UPDATE automation_followups SET cancelled_at = now() WHERE conversation_id IN (...) AND cancelled_at IS NULL`.
- Etapa 2 (existente): no loop principal, ao buscar `existingFollowup`, se `cancelled_at` estiver preenchido, pular a conversa (não disparar follow-up).

### Resultado esperado

- Assim que uma conversa sair da fila (atendente assume ou conversa muda de status) **e** já tiver Resumo IA gerado, todos os follow-ups daquela conversa são encerrados automaticamente na próxima execução do worker (a cada 2 min).
- Caso a conversa volte para a fila (`assigned_to = null` e `status = 'open'`) e seja necessário reativar, o registro de `cancelled_at` permanece (ciclo encerrado). Para reabrir, apenas novas mensagens inbound após reabertura criariam um novo ciclo (o registro existente bloqueado se mantém, mas isso casa com a regra de negócio: o ciclo daquela "rodada" foi encerrado).

### Arquivos envolvidos

- **Migration**: adicionar coluna `cancelled_at timestamptz` em `automation_followups`.
- **`supabase/functions/process-inactivity-followups/index.ts`**: nova etapa de cancelamento + filtro `cancelled_at IS NULL` na busca do `existingFollowup`.

