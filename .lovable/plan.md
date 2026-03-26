
Objetivo: corrigir 2 problemas no fluxo de anexos no Inbox:
1. o nome real do arquivo se perde e a UI cai no fallback "Documento";
2. anexos continuam aparecendo em duplicidade (um balão “carregando” e outro com status real).

Diagnóstico confirmado
- O frontend já faz a parte certa no envio:
  - `src/hooks/useMessages.ts` salva `metadata.file_name`
  - envia `internal_id`
  - envia `file_name` para o n8n
- O problema principal está na reconciliação e na renderização:
  1. `supabase/functions/webhook-n8n-instance/index.ts` não lê `file_name` no `upsert_message`, então a linha oficial `3EB...` fica sem `metadata.file_name`.
  2. Quando a reconciliação encontra a linha temporária, ela sobrescreve `metadata` com um objeto novo e apaga o `file_name` que veio do app.
  3. A reconciliação por `media_url` só roda dentro do bloco `if (internal_id)`. Se o webhook da mídia vier sem `internal_id`, a função faz upsert normal e cria uma segunda linha.
  4. No frontend, a aba “Arquivos” usa label hardcoded `"Documento"` em vez do nome real.
- Os dados atuais confirmam isso:
  - linhas temporárias de documento têm `metadata.file_name`
  - linhas oficiais de documento têm só `media_url/instance_id` e por isso a UI mostra `"Documento"`.

Plano de implementação

1. Corrigir a Edge Function para preservar o nome do arquivo
- Em `webhook-n8n-instance`, incluir `file_name` no payload do `upsert_message`.
- Montar `messageMetadata.file_name = file_name` quando vier no webhook.
- Ao reconciliar uma linha temporária, fazer merge do metadata existente com o novo metadata, em vez de substituir tudo.
- Resultado: a mesma mensagem continuará com o nome original mesmo depois de virar `sent/delivered/read`.

2. Tornar a reconciliação de mídia robusta mesmo sem `internal_id`
- Extrair a busca de mensagem candidata para uma rotina única:
  - por `client_message_id`
  - por `message_id = internal_id` legado
  - por `media_url` em mensagem outbound sem `message_id`
  - por `content` apenas como fallback final
- Executar essa rotina tanto quando `internal_id` vier quanto quando não vier.
- Se encontrar candidata, atualizar a mesma linha com `message_id` oficial e status final.
- Só criar nova linha quando realmente não existir nenhuma candidata válida.

3. Ajustar a deduplicação visual no Inbox como salvaguarda
- Em `src/pages/Inbox.tsx`, manter a lógica de deduplicação, mas deixá-la menos frágil para anexos:
  - priorizar `media_url`
  - não depender só da janela curta de 30s para mídia
  - esconder qualquer linha temporária sem `message_id` quando já existir uma oficial da mesma mídia na conversa
- Isso evita que o usuário veja o balão “carregando” junto com o balão final, mesmo em webhook atrasado.

4. Mostrar o nome real do arquivo em todos os lugares
- `src/pages/Inbox.tsx`
  - no balão do documento, continuar usando `metadata.file_name`
  - na aba “Arquivos”, trocar o label fixo `"Documento"` por um resolvedor de nome real
- `src/components/contacts/ContactDetails.tsx`
  - mesma correção para a lista de documentos
- Criar um helper de nome:
  - primeiro `metadata.file_name`
  - depois extrair do `media_url`
  - só por último cair em `"Documento"`
- Isso cobre tanto mensagens novas quanto parte do histórico já salvo sem `file_name`.

5. Limpar os registros duplicados já existentes
- Criar uma migração SQL de manutenção para:
  - copiar `file_name` e `mimetype` da linha temporária para a linha oficial correspondente da mesma mídia
  - remover a linha temporária redundante (`client_message_id` preenchido + `message_id` nulo) quando já existir a oficial
- Resultado: o banco deixa de crescer com anexos duplicados e o histórico passa a exibir melhor os nomes.

6. Validar ponta a ponta
- Testar envio de PDF, DOCX, imagem e áudio.
- Confirmar:
  - 1 envio = 1 linha persistida
  - o nome original continua visível no chat e na aba Arquivos
  - a mensagem sai de `sending` para status reais sem criar segundo balão
  - a linha oficial mantém `metadata.file_name`

Arquivos impactados
- `supabase/functions/webhook-n8n-instance/index.ts`
- `src/pages/Inbox.tsx`
- `src/components/contacts/ContactDetails.tsx`
- nova migração SQL em `supabase/migrations/`

Detalhes técnicos
- O bug do nome não está no upload nem no `useMessages`; está na hidratação da linha oficial.
- O bug da duplicidade não é só visual: hoje existem linhas temporárias `message_id = null` sobrando no banco.
- A correção principal é backend; o ajuste do frontend entra como proteção extra e para renderizar corretamente o histórico.
