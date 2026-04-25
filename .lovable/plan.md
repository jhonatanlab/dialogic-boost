## Plano

Três regras combinadas no worker `supabase/functions/process-inactivity-followups/index.ts`. Sem migration de schema — todas as checagens em tempo real, antes de cada disparo.

### Regra 1 — Bloquear se existe Resumo IA

Antes de processar uma conversa, verificar se há registro em `contact_ai_summaries` para o `contact_id` daquela conversa (escopo da empresa). Se existir, **pular** — não dispara follow-up.

```ts
const { data: aiSummary } = await supabase
  .from("contact_ai_summaries")
  .select("id")
  .eq("contact_id", conv.contact_id)
  .eq("company_id", companyId)
  .maybeSingle();

if (aiSummary) continue; // bloqueado por Resumo IA
```

### Regra 2 — Encerrar ao sair da fila

Já existe o filtro `status = 'open'` AND `assigned_to IS NULL` na query principal de conversas, então conversas que saíram da fila (atribuídas a atendente, ou status `in_progress`/`closed`) já são naturalmente ignoradas pelo worker. **Reforço defensivo**: re-checar essas duas condições em tempo real dentro do loop, antes de disparar, para evitar condição de corrida (ex: atendente assumiu entre a query e o disparo).

```ts
const { data: convFresh } = await supabase
  .from("conversations")
  .select("status, assigned_to")
  .eq("id", conv.id)
  .single();

if (!convFresh || convFresh.status !== "open" || convFresh.assigned_to !== null) continue;
```

### Regra 3 — Só dispara se a última mensagem foi do contato (com exceção para follow-up)

Buscar a **última mensagem** da conversa (qualquer direção). 

- Se a última for `inbound` → libera disparo (cliente foi o último a falar). ✅
- Se a última for `outbound` E **não for um follow-up** → bloqueia (bot/atendente respondeu, cliente precisa falar de novo). ❌
- Se a última for `outbound` E **for um follow-up anterior** → libera disparo (continua a cadência de follow-ups enquanto o cliente não responde). ✅

Para identificar se uma mensagem outbound é um follow-up, marcar as mensagens enviadas por automações de inatividade com `metadata.is_followup = true` no momento do disparo. Como o worker chama `execute-automation`, basta o worker passar uma flag na chamada e a função `execute-automation` propagar para `metadata` ao inserir a mensagem (ou, mais simples e isolado: o próprio worker pode escrever um marcador em `automation_executions` e o check usa cruzamento entre `messages.sent_at` e `automation_executions.executed_at` da mesma conversa, com tolerância de poucos segundos).

**Abordagem escolhida (mínima e sem alterar `execute-automation`)**: cruzar a última outbound com `automation_executions` da mesma conversa. Se existir uma execução de automação de inatividade dentro de ±60s do `sent_at` da última mensagem outbound, considerar essa outbound como um "follow-up" e liberar o próximo disparo.

```ts
const { data: lastMsg } = await supabase
  .from("messages")
  .select("direction, sent_at")
  .eq("conversation_id", conv.id)
  .order("sent_at", { ascending: false })
  .limit(1)
  .single();

if (!lastMsg) continue;

if (lastMsg.direction === "outbound") {
  // Verifica se essa outbound foi um follow-up (execução de automação de inatividade próxima no tempo)
  const sentAt = new Date(lastMsg.sent_at).getTime();
  const { data: nearbyExec } = await supabase
    .from("automation_executions")
    .select("id, automation_id, executed_at")
    .eq("conversation_id", conv.id)
    .in("automation_id", inactivityAutomationIds) // ids das automações trigger=inactivity da empresa
    .gte("executed_at", new Date(sentAt - 60_000).toISOString())
    .lte("executed_at", new Date(sentAt + 60_000).toISOString())
    .limit(1)
    .maybeSingle();

  if (!nearbyExec) continue; // outbound não é follow-up → bloqueia
  // se for follow-up, segue para checagens de cooldown/inactividade já existentes
}
```

`inactivityAutomationIds` é construído no início do worker a partir do array `automations` já buscado.

### Ordem das checagens (otimização)

Para cada conversa elegível, na seguinte ordem (mais barata primeiro):
1. Re-check defensivo de `status` e `assigned_to` (Regra 2).
2. Verificar última mensagem da conversa (Regra 3).
3. Se outbound, verificar se é follow-up via `automation_executions`.
4. Verificar Resumo IA (Regra 1).
5. Demais checagens existentes: tempo de inatividade, `max_followups`, cooldown per-automação.
6. Disparar `execute-automation` e gravar `automation_followups`.

### Arquivos envolvidos

- `supabase/functions/process-inactivity-followups/index.ts` — adicionar as três checagens descritas, sem alterar contratos externos.

### Resultado esperado

- Caso Kleber: contato com Resumo IA → **bloqueado** pela Regra 1. Mesmo sem o Resumo, como a última mensagem foi outbound do bot ("Vi que ainda não respondeu...") **sem ser um follow-up registrado em `automation_executions` próximo no tempo**, seria bloqueado pela Regra 3.
- Conversas que recebem várias cadências de follow-up (30min → 2h → 24h) continuam funcionando: cada follow-up anterior é reconhecido como "follow-up" pela checagem de `automation_executions`, então o próximo dispara normalmente até atingir `max_followups`.
- Assim que o atendente assume a conversa, todos os follow-ups param imediatamente (Regra 2).
- Assim que o Resumo IA é gerado, todos os follow-ups param imediatamente (Regra 1).