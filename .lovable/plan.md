

## Plano: Corrigir envio duplicado de mensagens

### Problema
Quando a "API Automação" está habilitada (`n8n_automation_enabled = true`), a mensagem é enviada **duas vezes** ao webhook outbound:

1. Dentro de `sendMessage.mutate()` no hook `useMessages.ts` — que já verifica se a automação está ativa e faz POST direto para `n8n_automation_outbound`
2. Logo em seguida, `postToOutbound()` no `Inbox.tsx` faz **outro POST** para o mesmo endpoint com o mesmo conteúdo

### Solução
Remover a chamada `postToOutbound()` para envio de mensagens em `handleSendMessage` (linhas 760-769 do `Inbox.tsx`). O hook `useMessages.ts` já gerencia corretamente o envio via API Automação ou API Nativa.

A função `postToOutbound` continuará existindo para os payloads de controle (`pause_ai`, `reactivate_ai`), que são chamados em outros pontos do código.

### Alterações

**`src/pages/Inbox.tsx`**
- Remover o bloco de código nas linhas 760-769 (o `postToOutbound` com payload de mensagem dentro de `handleSendMessage`)
- Nenhuma outra alteração necessária

### Arquivos modificados
- `src/pages/Inbox.tsx`

