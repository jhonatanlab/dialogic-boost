

## Plano: Incluir nome do atendente no conteúdo da mensagem enviada ao WhatsApp

### Problema
O nome do atendente aparece apenas visualmente no chat da aplicação, mas o conteúdo real da mensagem enviada ao WhatsApp não inclui essa identificação. O cliente no WhatsApp recebe apenas o texto puro.

### Solução
Prefixar o conteúdo da mensagem com `*NomeDoAtendente:*\n` antes de enviá-la, tanto no banco de dados quanto no payload para o n8n/WhatsApp. Isso usa a formatação de negrito do WhatsApp (`*texto*`).

### Alterações

**`src/pages/Inbox.tsx` — função `handleSendMessage`**
- Buscar o `full_name` do usuário atual (já disponível via `companyAgents` ou uma query ao `profiles`)
- Armazenar o nome do atendente logado em um estado (ex: `currentUserName`)
- Antes de chamar `sendMessage.mutate()`, prefixar o conteúdo:
  ```
  const prefixedContent = `*${currentUserName}:*\n${textContent}`;
  ```
- Passar `prefixedContent` como `content` no `sendMessage.mutate()` e no `postToOutbound()`
- Isso garante que tanto o registro no banco quanto a mensagem enviada ao WhatsApp contenham o nome

**`src/pages/Inbox.tsx` — useEffect de inicialização**
- Na query que já busca o perfil do usuário (linha ~412), incluir `full_name` no select
- Salvar em um novo estado `currentUserName`

**`src/pages/Inbox.tsx` — ChatBubble**
- Remover a exibição visual separada do nome do atendente (já que agora estará no conteúdo)
- Ou manter a exibição visual e, ao renderizar, remover o prefixo do conteúdo para não duplicar

### Detalhes técnicos
- A formatação `*texto*` gera negrito no WhatsApp
- O nome será incluído apenas em mensagens de texto (não em mídias sem texto)
- O prefixo será aplicado apenas quando houver conteúdo textual

### Arquivos modificados
- `src/pages/Inbox.tsx`

