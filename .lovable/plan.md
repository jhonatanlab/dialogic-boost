

## Problema: Tempo Médio de Resposta Hardcoded

O campo `avgResponseTime` no hook `useDashboardStats.ts` (linha 136) está fixado como `"—"` — nunca é calculado a partir dos dados reais.

## Plano

### 1. Calcular o tempo médio de primeira resposta

**File: `src/hooks/useDashboardStats.ts`**

Para cada conversa que tem mensagens, calcular o tempo entre a primeira mensagem **inbound** (do contato) e a primeira mensagem **outbound** (do atendente). A média desses deltas é o "tempo médio de resposta".

- Buscar mensagens das conversas filtradas, agrupando por `conversation_id`, com `direction` e `sent_at`
- Para cada conversa: encontrar o primeiro par inbound→outbound e calcular o delta em milissegundos
- Calcular a média dos deltas e formatar como "Xm Ys" ou "Xh Ym"

### Lógica de cálculo

```text
Para cada conversa:
  1. Ordenar mensagens por sent_at ASC
  2. Encontrar a primeira mensagem com direction = 'inbound'
  3. Encontrar a primeira mensagem com direction = 'outbound' APÓS a inbound
  4. Delta = outbound.sent_at - inbound.sent_at
  
Média = soma(deltas) / count(deltas)
Formatar: < 60s → "Xs", < 3600s → "Xm Ys", else → "Xh Ym"
```

### Detalhes técnicos

**Adicionar query de mensagens** no `useDashboardStats` para buscar `conversation_id, direction, sent_at` das mensagens da empresa no período filtrado. Limitar a busca às conversas já carregadas para eficiência (usar `.in('conversation_id', convIds)`).

**Calcular o delta** iterando por conversa, encontrando o primeiro par inbound→outbound.

**Substituir** a linha `avgResponseTime: "—"` pelo valor calculado e formatado.

### Observação sobre performance

A query pode retornar muitas mensagens. Para mitigar, limitaremos a busca às primeiras 2 mensagens por conversa usando ordenação e filtrando apenas `direction IN ('inbound','outbound')`. Alternativamente, buscaremos apenas conversas dos últimos 30 dias se nenhum filtro de data for aplicado.

