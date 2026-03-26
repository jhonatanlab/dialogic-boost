
Objetivo: eliminar a duplicidade física no banco, para que cada mensagem enviada pelo painel ocupe uma única linha e continue recebendo os status corretos.

Diagnóstico confirmado
- Hoje o frontend ainda cria uma linha temporária `app-...` em `messages`.
- A Edge Function `webhook-n8n-instance` só reconcilia essa linha se o `internal_id` chegar e casar exatamente.
- Quando isso falha, o `upsert_message` faz um upsert normal com o ID oficial `3EB...` e sobra a linha `app-...`.
- O `Inbox` já tenta esconder parte disso visualmente, mas a duplicidade continua persistindo no banco.

Plano
1. Tornar a reconciliação robusta no backend
- Ajustar `upsert_message` para não depender só do `internal_id`.
- Ordem de reconciliação:
  1. procurar por `internal_id`;
  2. se não achar, procurar uma mensagem temporária recente (`app-...`) da mesma conversa/direção/conteúdo ou mesma mídia;
  3. se achar, atualizar a MESMA linha trocando para o `message_id` oficial `3EB...`;
  4. só criar nova linha quando realmente não existir candidata válida.

2. Separar melhor ID temporário de ID oficial
- Adicionar uma coluna dedicada para o ID interno do app, por exemplo `client_message_id`.
- O registro inicial do painel passa a salvar:
  - `client_message_id = app-uuid`
  - `message_id = null` até chegar o ID oficial
- Assim o ID oficial deixa de disputar espaço com o ID temporário na mesma coluna.

3. Ajustar o fluxo de envio no frontend
- Em `useMessages`, continuar salvando a mensagem antes do POST, mas gravando o temporário em `client_message_id`.
- Continuar enviando `internal_id` para o n8n.
- Manter realtime como está, para a mesma linha mudar de `sending` para `sent/delivered/read`.

4. Ajustar `update_message_status`
- Buscar primeiro por `message_id` oficial, como já faz.
- Se não encontrar, tentar reconciliar com uma mensagem temporária recente compatível antes de criar shell.
- Criar shell só como último recurso, para evitar novas linhas desnecessárias.

5. Limpar o histórico duplicado já existente
- Criar uma migração para identificar pares `app-...` + `3EB...` da mesma mensagem.
- Preservar a linha mais completa/mais avançada e remover a redundante.
- Isso reduz o crescimento inútil do banco e deixa os relatórios consistentes.

Arquivos impactados
- `supabase/functions/webhook-n8n-instance/index.ts`
- `src/hooks/useMessages.ts`
- `src/pages/Inbox.tsx` (apenas como proteção visual extra)
- nova migração SQL em `supabase/migrations/`

Detalhes técnicos
- Manter `UNIQUE(message_id)` para o ID oficial.
- Adicionar `UNIQUE(client_message_id)` para o ID temporário.
- A reconciliação deve preservar o status mais avançado (`read` > `delivered` > `sent` > `sending`).
- A limpeza antiga no `Inbox` pode continuar, mas vira só salvaguarda; a correção real fica no backend e na modelagem.

Resultado esperado
- 1 envio do painel = 1 linha persistida.
- A mesma linha recebe o ID oficial depois.
- Os checks/status continuam funcionando.
- O banco para de acumular duplicatas da mesma mensagem.
