## Objetivo

Permitir atribuir uma equipe (e também um atendente) à conversa selecionada diretamente pelo painel lateral direito do Inbox, sem depender do botão "Transferir" e sem exigir que a conversa esteja aceita/iniciada (status `in_progress`).

## Onde mexer

Arquivo único: `src/pages/Inbox.tsx`, seção do painel lateral entre as linhas ~1710-1727 (blocos "Atendente" e "Equipe" que hoje são apenas leitura).

## O que muda na UI

Transformar as duas linhas atualmente estáticas em selects inline compactos:

- **Atendente** → `Select` com opções: "Não atribuído" + lista de `companyAgents` (já disponível no componente).
- **Equipe** → `Select` com opções: "Nenhuma" + lista de `companyTeams` (já disponível).

Mantém o mesmo visual do painel (altura ~28px, texto xs). Sem novo dialog.

Regra de permissão de edição:
- Admin/manager: sempre podem alterar.
- Atendente: só pode alterar se a conversa é dele (`assigned_to === currentUserId`) ou está sem atribuição. Caso contrário, mostra somente leitura como hoje.

## O que muda na lógica

Nova função `handleQuickAssign({ field, value })` que:

1. Faz `update` em `conversations` setando `assigned_to` OU `assigned_team` (valor `null` quando o usuário escolhe "Não atribuído"/"Nenhuma").
2. **Não** altera `status` da conversa — ao contrário do fluxo atual de "aceitar", que muda para `in_progress`. Assim funciona mesmo em conversa `open` não iniciada.
3. Registra evento em `conversation_events` (`assigned_agent` ou `transferred_team`) reaproveitando o mesmo padrão do `handleTransfer` atual (linhas ~1030-1055).
4. Invalida `queryClient` de `conversations` e mostra `toast.success`.

O botão/dialog "Transferir" existente continua funcionando sem alteração — passa a ser redundante para atribuição simples, mas útil como atalho.

## Backend

Nenhuma migração. A RLS restritiva de `conversations` já criada anteriormente permite `UPDATE` para admin/manager e para quem enxerga a conversa (sem equipe, atribuída a si, ou membro da equipe atual), o que cobre os casos acima.

## Fora de escopo

- Não cria coluna `team_id` em `contacts`.
- Não altera o fluxo de "aceitar conversa".
- Não altera o botão Transferir nem o gating de envio de mensagem.