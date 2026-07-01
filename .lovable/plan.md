# Botão de reenviar mensagem falhada/travada

## Problema
Quando o envio via API retorna erro 400 (ou fica preso em `sending` indefinidamente), a mensagem no chat mostra apenas o loader eterno, sem opção de recuperação.

## Solução

### 1. Detectar mensagem "travada"
No `ChatBubble` (`src/pages/Inbox.tsx`), tratar como falha quando:
- `status === "failed"`, OU
- `status === "sending"` **e** `created_at` tem mais de **60 segundos** (timeout considerado suficiente; o loop atual do usuário chega a 3 min, então 60s cobre com folga).

Um pequeno `useEffect` com `setInterval` de 15s força o re-render para reavaliar o timeout enquanto a mensagem estiver em `sending`.

### 2. UI do botão
Quando `isStuck` = true, dentro do bubble de mensagens outbound:
- Substituir/complementar o `StatusTicks` por uma linha inferior com:
  - Ícone/texto pequeno em `text-destructive`: "Falha ao enviar"
  - Botão `variant="ghost" size="sm"` com ícone `RotateCw` e label **"Reenviar"**.
- Ao clicar, dispara `retry` (loading local no botão, `disabled` enquanto envia).

### 3. Lógica de reenvio
Adicionar `retryMessage` no hook `src/hooks/useMessages.ts` (mutation nova) que:
1. Recebe a `Message` original.
2. Marca `status = 'sending'` novamente no DB (`update` por id).
3. Reconstrói o mesmo payload usado em `sendMessage` (usa `metadata.media_url`, `mimetype`, `file_name`, `message_type`, `content`, reaproveitando `client_message_id` existente como `internal_id`).
4. Resolve `phone` e `companyId` via `conversations`+`contacts` (buscar uma vez) ou receber como argumento do componente (preferência: passar `phone`/`companyId` que já estão no escopo do Inbox).
5. Faz o mesmo dispatch atual (API Automação outbound → `fetch` direto; senão `proxy-n8n` com `n8n_send_message`).
6. Em erro, volta status para `failed`. Em sucesso, invalida `["messages", conversationId]`.

Assinatura sugerida:
```ts
retryMessage.mutate({ message, phone, companyId })
```

### 4. Integração no Inbox
- `ChatBubble` recebe nova prop opcional `onRetry?: (message: Message) => void`.
- Onde `ChatBubble` é renderizado (linha ~1414), passar `onRetry={handleRetryMessage}` quando `canSendMessages`.
- `handleRetryMessage` no `Inbox.tsx` chama `retryMessage.mutate` com o `phone` do contato e `companyId` já disponíveis, exibe `toast.success`/`toast.error`.

## Fora do escopo
- Não alterar comportamento do webhook de reconciliação.
- Não implementar retry automático (apenas manual, por clique).
- Não mexer na lógica de status de mensagens inbound.
