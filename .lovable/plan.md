## Problema

Follow-ups de automações diferentes (30min, 2h, 24h, 2d) podem disparar em sequência rápida porque cada uma calcula sua janela a partir da última mensagem **inbound** do contato. Se o contato ficou inativo por muito tempo (ex.: 18h), todas as janelas já estão "vencidas" e disparam uma após a outra nas execuções seguintes do worker (a cada 2 min).

No caso do Vinicius Sousa: Follow-Up 30min às 16:34 → Follow-Up 2h às 16:36 (intervalo de 90s).

## Solução proposta

Adicionar um **cooldown global por conversa** no worker `process-inactivity-followups`: após qualquer follow-up de inatividade ser enviado para uma conversa, **nenhuma outra automação de inatividade** pode disparar para essa mesma conversa até que se passe um tempo mínimo razoável **OU** até que o contato responda (nova mensagem inbound).

### Regra exata

Antes de disparar um follow-up para a conversa, verificar:

1. Buscar o último registro em `automation_followups` para essa `conversation_id` (qualquer automação) com `last_followup_at` mais recente.
2. Se existe um follow-up enviado e:
   - **Não houve mensagem inbound após esse follow-up** (ou seja, o cliente não respondeu desde então), E
   - O `inactivity_minutes` da automação atual sendo avaliada **é maior** que a anterior (significa que é um "próximo nível" da escada de follow-ups),
   
   então: **exigir que tenha passado pelo menos `inactivity_minutes` da automação atual desde o último follow-up enviado** (não desde o último inbound).

Em outras palavras: a janela das automações "mais longas" (2h, 24h, 2d) passa a ser contada a partir do **último follow-up enviado**, não a partir do último inbound do contato. Isso evita o efeito cascata.

### Pseudocódigo

```typescript
// Após passar nas checagens existentes (status, AI summary, last msg direction),
// e antes de disparar:

const { data: lastFollowupAny } = await supabase
  .from("automation_followups")
  .select("last_followup_at, automation_id")
  .eq("conversation_id", conv.id)
  .order("last_followup_at", { ascending: false, nullsFirst: false })
  .limit(1)
  .maybeSingle();

if (lastFollowupAny?.last_followup_at) {
  const lastFollowupTs = new Date(lastFollowupAny.last_followup_at).getTime();
  
  // Verificar se houve inbound após o último follow-up
  const { data: inboundAfter } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conv.id)
    .eq("direction", "inbound")
    .gt("sent_at", lastFollowupAny.last_followup_at)
    .limit(1)
    .maybeSingle();
  
  // Se NÃO houve resposta do cliente, exigir que a janela desta automação
  // tenha decorrido desde o último follow-up (não desde o último inbound)
  if (!inboundAfter) {
    if (now - lastFollowupTs < threshold) continue; // bloqueia
  }
  // Se houve inbound após, libera (regra normal já cuida)
}
```

## Resultado esperado no caso Vinicius

- 24/04 22:23 — cliente envia "Oi"
- 24/04 22:24 — bot responde
- 25/04 16:34 — Follow-Up 30min dispara (nenhum follow-up anterior, libera)
- 25/04 16:36 — worker avalia Follow-Up 2h:
  - última inbound foi às 22:23 (~18h atrás) → passa janela de inatividade
  - **MAS** existe follow-up enviado às 16:34, sem inbound depois
  - Verifica: `now - 16:34 = 2min < 120min` → **BLOQUEIA** ✅
- Próximo disparo do Follow-Up 2h só aconteceria 2h após 16:34 = **18:34**, e só se o cliente continuar sem responder.
- Mesma lógica para 24h e 2 dias: cada um espera sua própria janela a partir do último follow-up.

## Arquivo afetado

- `supabase/functions/process-inactivity-followups/index.ts` — adicionar bloco de checagem do "último follow-up qualquer + inbound posterior" antes da execução.

Sem mudanças de schema, sem migrations.
