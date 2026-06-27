## Objetivo
Tornar visível, após uma conversa ser concluída, o **motivo** e as **observações** registrados no modal de conclusão.

Hoje esses dados já são salvos em `conversation_closures` e também como `details` no evento `closed` em `conversation_events`, mas não são renderizados em lugar nenhum da interface.

## Onde mostrar

1. **Aba "Histórico" da conversa (painel lateral direito do Inbox)**
   - No card do evento `closed`, exibir abaixo de "Por: <atendente>":
     - `Motivo: <reason>` (badge com a cor padrão de motivos)
     - `Observações: <notes>` (texto multilinha, quando houver)
     - Tags aplicadas no encerramento, se existirem nos `details`.

2. **Cabeçalho da conversa quando `status === "closed"`**
   - Adicionar uma faixa discreta logo abaixo do header com:
     - "Concluída em <data/hora> por <atendente>"
     - "Motivo: <reason>"
     - Ícone de "ver observações" que abre um popover com as notas completas (evita poluir o header quando o texto é longo).
   - Buscar o último registro de `conversation_closures` da conversa via React Query (`useClosureSummary(conversationId)`), com realtime invalidando quando um novo `closed` é registrado.

3. **Lista de conversas — aba "Concluídas"**
   - Mostrar o nome do motivo como um pequeno badge ao lado do preview da última mensagem (apenas o motivo, sem notas), para facilitar triagem visual.

## Implementação técnica

- Novo hook `src/hooks/useConversationClosure.ts`:
  - Query: último registro de `conversation_closures` por `conversation_id` (com join em `closure_reasons` para nome/cor).
  - Para a lista, fazer um único fetch em batch dos motivos das conversas concluídas visíveis e mapear por `conversation_id`.
- Renderização no `src/pages/Inbox.tsx`:
  - Estender o bloco do evento `closed` (linhas ~1929-1953) para imprimir `details.reason` e `details.notes`.
  - Inserir a faixa de resumo no header da conversa quando `selectedConversation.status === "closed"`.
  - Adicionar badge de motivo no item da lista quando o filtro ativo for `closed`.
- Sem mudanças de schema: tabelas `conversation_closures`, `closure_reasons` e `conversation_events` já contêm tudo.
- Garantir GRANT/RLS existentes continuam suficientes (leitura por `company_id`).

## Fora de escopo
- Edição do motivo/observações após a conclusão.
- Exposição em Dashboard/Relatórios (já existem como métricas separadas).
