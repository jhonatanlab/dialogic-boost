

## Plano: Identificação do atendente nas mensagens enviadas

### Problema
As mensagens outbound no chat não mostram quem as enviou. O usuário quer ver o nome do atendente em negrito acima do conteúdo, como no print: **"Consultor | Artur Alves:"**.

### Solução

**1. Buscar nomes dos atendentes no hook `useMessages`**
- Após carregar as mensagens, coletar todos os `user_id` distintos das mensagens outbound
- Fazer uma query na tabela `profiles` para buscar `full_name` e `role` de cada `user_id`
- Retornar um mapa `agentNames: Record<string, string>` junto com as mensagens

**2. Passar o mapa de nomes para o ChatBubble**
- No componente `Inbox.tsx`, passar uma prop `agentName` para o `ChatBubble` usando o mapa retornado pelo hook
- O nome será resolvido via `message.user_id`

**3. Exibir o nome no ChatBubble (apenas outbound)**
- Antes do conteúdo da mensagem, renderizar o nome do atendente em negrito
- Formato: **"Nome do Atendente:"** em uma linha separada, seguido pelo conteúdo
- Estilo: texto em negrito, tamanho ligeiramente menor, cor do texto principal

### Arquivos modificados
- `src/hooks/useMessages.ts` — adicionar query de perfis e retornar `agentNames`
- `src/pages/Inbox.tsx` — atualizar `ChatBubble` para receber e exibir o nome do atendente

### Detalhes técnicos
- A query de perfis usa `user_id IN (...)` para buscar apenas os atendentes relevantes
- Mensagens sem `user_id` (ex: automações) não exibirão nome
- O nome é exibido apenas em mensagens outbound

