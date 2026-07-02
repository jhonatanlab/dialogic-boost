## Problema

Ao clicar em "Reenviar", o request é disparado com sucesso, mas o bubble continua mostrando "Falha ao enviar / Reenviar" (loader ou erro). Motivo: `isStuck` é calculado como `status === "sending" && ageMs > 60_000`, e o `ageMs` é medido a partir do `sent_at`/`created_at` **original** da mensagem. Como o retry não altera esse timestamp, a idade continua > 60s e o bubble segue marcado como travado até o webhook chegar (e se o webhook demorar ou não vier, nunca sai desse estado).

Além disso, hoje o hook só invalida a query em caso de sucesso; ele não atualiza otimisticamente o status.

## Solução

### 1. `src/hooks/useMessages.ts` — `retryMessage`
- No início do retry, além de `status = 'sending'`, atualizar também `sent_at = new Date().toISOString()`. Isso zera o cronômetro do `isStuck` para o novo envio.
- Ao concluir a chamada HTTP com sucesso (antes do webhook), atualizar `status = 'sent'` para dar feedback imediato (mesmo padrão de confiança que o webhook depois reconcilia para `delivered`/`read`).
- Manter fallback: em erro, reverter para `status = 'failed'` (já existe).
- Invalidar `["messages", message.conversation_id]` e `["conversations"]` após o update otimista e após sucesso.

### 2. `src/pages/Inbox.tsx` — `ChatBubble`
- Nenhuma mudança de UI necessária: com `sent_at` atualizado e `status = 'sent'`, `isStuck` volta a `false` naturalmente e o `StatusTicks` volta a aparecer.
- Garantir que o `handleRetry` local do bubble faça `setRetrying(false)` também em caso de sucesso (já faz via `finally`), sem alterações extras.

## Fora do escopo
- Não mexer no fluxo do `sendMessage` inicial.
- Não alterar o webhook de reconciliação — ele continua responsável por promover `sent → delivered → read`.
- Sem retry automático.
