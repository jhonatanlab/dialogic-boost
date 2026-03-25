
Objetivo: eliminar o “conflito de IDs” entre a mensagem otimista/local e o ID oficial do WhatsApp, sem perder os checks de status e sem gerar balões vazios.

1. Corrigir a causa real no backend
- O problema não está mais no frontend salvando no banco: o chat já envia só para o n8n e mantém UI otimista local.
- O bug atual vem da função `webhook-n8n-instance`:
  - `update_message_status` ainda cria uma “shell message” quando o status chega antes do conteúdo.
  - depois, em `upsert_message`, quando encontra a linha pelo `message_id`, ela só atualiza `status` e `metadata`, mas não preenche `content`, `message_type`, `conversation_id` etc.
- Resultado: a linha vazia continua existindo e aparece como balão sem texto.

2. Ajustar `update_message_status` para trabalhar só com o ID oficial
- Remover a lógica legada de reconciliação com `message_id like 'app-%'`, porque o frontend não grava mais mensagens temporárias no banco.
- Manter apenas este fluxo:
  1. tentar localizar por `message_id` oficial;
  2. se não existir, criar/upsertar a linha “shell” com `conversation_id`, `contact_id`, `user_id` e `company_id`;
  3. marcar essa linha como pendente de conteúdo no `metadata` (ex.: `pending_content: true`).
- Assim o status já fica vinculado ao registro certo, mas o sistema sabe que ainda não deve exibir essa linha como mensagem final.

3. Corrigir `upsert_message` para hidratar a shell existente
- No ramo em que já existe mensagem com o mesmo `message_id`, atualizar a linha inteira, não só `status` e `metadata`.
- Preencher/atualizar:
  - `content`
  - `message_type`
  - `direction`
  - `conversation_id`
  - `contact_id`
  - `user_id`
  - `company_id`
  - `channel`
  - `metadata` (incluindo `media_url`/`mimetype`)
  - `created_at`/`sent_at` quando fizer sentido
- Limpar o flag de pendência (`pending_content: false` ou remover do metadata).
- Isso faz com que o status inicial e o conteúdo final caiam na mesma linha do banco.

4. Esconder balões “shell” no Inbox até estarem completos
- Mesmo com hidratação rápida, pode existir um intervalo de milissegundos em que a shell chega pelo Realtime antes do conteúdo.
- No `Inbox.tsx`, filtrar da renderização qualquer mensagem outbound que:
  - não tenha texto visível,
  - não tenha mídia utilizável,
  - e esteja marcada como `pending_content` no metadata.
- Isso evita o balão vazio sem quebrar os ticks quando a mensagem for completada.

5. Ajustar a reconciliação otimista no chat
- Manter a mensagem otimista apenas em memória, como já está hoje.
- Garantir que ela só seja removida quando chegar a mensagem real “completa” do banco.
- Na comparação `optimisticMatchesReal`, ignorar linhas shell/pending, para não reconciliar com um registro ainda vazio.

6. Evitar preview vazio na lista de conversas
- Hoje `useConversations` busca a última mensagem por conversa com `limit(1)`.
- Se a última for uma shell vazia, o preview pode ficar errado.
- Ajuste proposto:
  - buscar as últimas poucas mensagens da conversa (ex.: 3–5);
  - usar como preview a primeira que tenha conteúdo visível ou mídia;
  - ignorar shells pendentes.

7. Validação após implementar
- Cenário 1: enviar texto e receber status antes do conteúdo.
  - esperado: aparece só a mensagem otimista;
  - depois ela é substituída pela mensagem real com o mesmo status.
- Cenário 2: enviar mídia.
  - esperado: não surge balão vazio;
  - a mídia oficial substitui a otimista quando chegar do backend.
- Cenário 3: sequência `sent -> delivered -> read`.
  - esperado: os checks atualizam no mesmo balão final, sem criar novos.

Detalhes técnicos
- Arquivos principais:
  - `supabase/functions/webhook-n8n-instance/index.ts`
  - `src/pages/Inbox.tsx`
  - `src/hooks/useConversations.ts`
- Não vejo necessidade de mudança de schema para resolver isso.
- O log que você compartilhou confirma exatamente a corrida:
  - primeiro `update_message_status` não encontra a mensagem e cria shell;
  - depois o sistema passa a atualizar essa linha pelo `message_id`.
- O ponto crítico que falta hoje é: a shell criada pelo status precisa ser completada pelo `upsert_message`, e o frontend não pode renderizar shell vazia enquanto isso não acontece.
