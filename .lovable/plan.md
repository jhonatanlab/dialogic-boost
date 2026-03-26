

## Problemas identificados

**1. Status "read" não conta como "delivered":**
Na linha 70-71, a contagem usa `===` (igualdade estrita). Uma mensagem com status `read` **não** incrementa `total_delivered` porque o código só conta `delivered` exato. Na hierarquia do WhatsApp, `read` implica que foi entregue. O mesmo vale para `played`.

**2. Duas mensagens "enviadas" para uma só mensagem:**
O fluxo de reconciliação cria primeiro uma linha com ID `app-xxx` (status `sending`), e depois o n8n pode criar/atualizar outra linha com o ID oficial `3EB...`. Se a reconciliação via `internal_id` falhar, ficam duas linhas outbound. A contagem `total_sent` incrementa para **toda** mensagem outbound, incluindo as com status `sending` (ainda pendentes) e shells duplicadas.

## Solução

### Arquivo: `src/hooks/useAnalytics.ts` (linhas 67-76)

Ajustar a lógica de contagem para:

1. **Hierarquia cumulativa de status:** Se `read` ou `played`, incrementar tanto `total_read` quanto `total_delivered`. Se `delivered`, incrementar apenas `total_delivered`.

2. **Filtrar duplicatas e shells:** Não contar mensagens com status `sending` como "enviadas" (são pendentes). Também ignorar mensagens com `metadata.pending_content: true` (shells de race condition).

3. **Deduplicar por `message_id`:** Se duas linhas tiverem o mesmo `message_id` (não nulo), contar apenas a de status mais avançado.

### Mudanças concretas

```typescript
// Buscar também message_id e metadata para deduplicação
.select("direction, status, message_id, metadata")

// Deduplicar: agrupar por message_id, manter status mais avançado
// Filtrar shells (pending_content) e status "sending"

(data || []).forEach((msg) => {
  if (msg.direction === "outbound") {
    // Não contar mensagens ainda em "sending" como enviadas
    if (msg.status === "sending") return;
    // Ignorar shells sem conteúdo
    if (msg.metadata?.pending_content) return;
    
    stats.total_sent++;
    // Hierarquia: read/played implica delivered
    if (msg.status === "delivered" || msg.status === "read" || msg.status === "played") {
      stats.total_delivered++;
    }
    if (msg.status === "read" || msg.status === "played") {
      stats.total_read++;
    }
    if (msg.status === "failed") stats.total_failed++;
  } else {
    stats.total_received++;
  }
});
```

Adicionar deduplicação por `message_id` antes do loop para eliminar contagem dupla de linhas `app-xxx` e `3EB...` que representam a mesma mensagem.

