

## Corrigir Automação de Follow-up por Inatividade

Dois problemas identificados na Edge Function `process-inactivity-followups`:

### Problema 1: Envia para conversas já em atendimento

A query atual busca conversas com status `open` e `in_progress` sem verificar se há um atendente atribuído (`assigned_to`). Conversas com `assigned_to IS NOT NULL` (em atendimento) devem ser ignoradas.

### Problema 2: Todas as automações disparam de uma vez em contatos antigos

As 3 automações (30min, 1 dia, 3 dias) são independentes entre si. Um contato inativo há 10 dias atende ao critério de **todas** simultaneamente. Falta uma verificação cruzada: se uma automação de menor tempo já cobriu aquela conversa, as de maior tempo não devem disparar na mesma janela. Além disso, a automação não deveria disparar se a conversa foi criada **antes** da automação ser ativada.

### Correções na Edge Function

**Arquivo**: `supabase/functions/process-inactivity-followups/index.ts`

1. **Filtrar conversas em atendimento**: Adicionar `.is("assigned_to", null)` na query de conversas, removendo `in_progress` do filtro de status. Somente conversas `open` sem atendente atribuído devem ser elegíveis.

2. **Ignorar conversas antigas**: Adicionar filtro para processar apenas conversas cuja última mensagem inbound ocorreu **após** a criação/ativação da automação (`automation.created_at`). Isso evita disparar em contatos históricos.

3. **Evitar disparo simultâneo entre automações**: Verificar se já existe **qualquer** follow-up recente (de qualquer automação de inatividade da mesma empresa) para aquela conversa nas últimas 24 horas. Se sim, pular. Isso impede que 3 automações disparem ao mesmo tempo.

4. **Ignorar conversas concluídas**: Remover `in_progress` do filtro de status, mantendo apenas `open`.

### Detalhes Técnicos

Mudanças na query de conversas (linha 41-46):
- Filtrar apenas `status = 'open'`
- Adicionar `.is("assigned_to", null)` para excluir conversas atendidas

Novo filtro temporal (após linha 67):
- Comparar `lastInboundAt` com `automation.created_at` -- se a mensagem é anterior à criação da automação, pular

Novo filtro cross-automation (após verificação de followup count):
- Consultar `automation_followups` pela `conversation_id` (sem filtro de `automation_id`) para verificar se houve algum follow-up nas últimas 24h de qualquer automação

