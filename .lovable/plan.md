## Causa raiz

Investiguei a empresa `8559e919-3d02-477c-890a-fcb4ebb58d6e`:

- 4 automações de inatividade ativas (30min, 2h, 24h, 2 dias).
- 38 conversas em `status='open'` e `assigned_to IS NULL` (todas elegíveis em tese).
- Worker `process-inactivity-followups` rodando normalmente a cada 2 minutos.
- A tabela `automation_followups` está **vazia** para essas conversas — nenhum follow-up foi disparado.

Caso concreto (Kleiton Gomes, conv `9bd14dd7-...`):
- Última inbound: 11:49 UTC. Última outbound: 11:50 UTC. Agora: ~17:53 UTC → 6h de inatividade real.
- Deveria ter disparado pelo menos o "Follow-Up 30min" e o "Follow-Up 2h".
- Não disparou nenhum.

O bloqueio está na regra **2.3** que adicionamos antes:

```ts
if (lastMsg.direction === "outbound") {
  // só libera se existir uma automation_executions perto desse outbound
  const { data: nearbyExec } = await supabase
    .from("automation_executions")
    .select("id")
    .eq("conversation_id", conv.id)
    .in("automation_id", inactivityAutomationIds)
    .gte("executed_at", new Date(sentAt - 60_000).toISOString())
    .lte("executed_at", new Date(sentAt + 60_000).toISOString())
    ...
  if (!nearbyExec) continue; // bloqueia
}
```

A intenção era: "se a última mensagem foi outbound, só seguir se essa outbound for um follow-up nosso (não um envio manual do atendente)".

**Mas as mensagens outbound da IA / agente automático da conversa não geram registro em `automation_executions`** — só as próprias automações de follow-up por inatividade geram. Então qualquer conversa onde a IA respondeu por último é silenciosamente pulada para sempre, e o follow-up nunca dispara.

Isso explica 100% do comportamento observado.

## Correção

Trocar o critério "outbound = bloqueia salvo se for follow-up" por "outbound = bloqueia **somente** se foi enviada por um atendente humano". Ou seja: outbounds enviadas por IA/automação/sistema não devem cancelar o follow-up — elas são parte do fluxo automatizado em que o cliente parou de responder, que é exatamente o que queremos cobrir.

### Lógica nova em `process-inactivity-followups/index.ts` (passo 2.3)

```ts
if (lastMsg.direction === "outbound") {
  // Buscar metadados da última mensagem para distinguir humano vs automação/IA
  const { data: lastOutFull } = await supabase
    .from("messages")
    .select("sender_id, sent_by, metadata")
    .eq("conversation_id", conv.id)
    .eq("direction", "outbound")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Se foi enviada por um atendente humano (sender_id preenchido com user_id),
  // bloqueia — significa intervenção manual, não cabe follow-up automático.
  if (lastOutFull?.sender_id) continue;

  // Caso contrário (IA, automação, follow-up anterior, sistema) → segue.
}
```

Mantemos os demais gates (resumo IA bloqueia, conversa precisa estar `open`+sem atendente, cooldown global por último follow-up, janela de inatividade calculada a partir do último inbound).

### Por que isso resolve

- Conversas onde a IA respondeu por último (cliente sumiu) voltam a ser elegíveis ✅
- Conversas onde um atendente humano enviou a última mensagem continuam protegidas (não disparamos follow-up por cima do humano) ✅
- O cooldown entre 30min/2h/24h/2d continua funcionando via `automation_followups.last_followup_at` (já corrigido antes) ✅

### Verificação que vou rodar antes de declarar concluído

1. Conferir o nome real da coluna que identifica "atendente humano" em `messages` (`sender_id` ou `sent_by`); se for outro nome, ajustar a query acima de acordo. Caso nenhuma coluna identifique humano de forma confiável, alternativa: comparar o `sender_id` da mensagem com a lista de `agents.user_id` da empresa.
2. Após o deploy, simular: olhar o log da próxima execução (a cada 2min) e confirmar que a tabela `automation_followups` passa a receber inserts para conversas como a do Kleiton.

### Arquivos editados

- `supabase/functions/process-inactivity-followups/index.ts`
