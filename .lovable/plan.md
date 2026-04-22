
## Plano de correção

### 1. Métricas reais das automações

Vou ajustar o modal de detalhes das automações para calcular as métricas a partir das mensagens reais enviadas pela automação, e não apenas da tabela `automation_executions`.

Hoje o problema acontece porque `automation_executions` registra a execução com status `sent`, mas os status posteriores (`delivered`, `read`, `replied`) ficam na tabela de mensagens/webhook. Por isso o modal só mostra “enviadas”.

#### O que será alterado

**Arquivo:** `src/components/automations/AutomationDetailModal.tsx`

- Buscar mensagens outbound que tenham `metadata.automation_id` igual ao fluxo selecionado.
- Aplicar o filtro de datas usando `sent_at`/`created_at`.
- Calcular as métricas com hierarquia correta:
  - **Enviadas:** `sent`, `delivered`, `read`
  - **Entregues:** `delivered`, `read`
  - **Visualizadas:** `read`
  - **Falhas:** `failed`
- Calcular **respondidas** procurando mensagens inbound posteriores às mensagens da automação na mesma conversa/contato.
- Manter fallback para `automation_followups` apenas quando não existirem mensagens rastreáveis, para não quebrar dados antigos.
- Ajustar a “Taxa de Sucesso” para refletir mensagens efetivamente enviadas/entregues e falhas.

### 2. Melhorar rastreamento futuro das automações

**Arquivo:** `supabase/functions/execute-automation/index.ts`

Vou garantir que todas as mensagens enviadas por automação continuem salvando metadados suficientes para o dashboard:

```ts
metadata: {
  automation_id,
  node_id,
}
```

Também vou revisar se o status inicial da mensagem deve continuar como `sending` ou ser normalizado para `sent` quando o webhook de envio confirmar sucesso, para evitar contagens incompletas.

### 3. Card “Usuários Online” apenas para gerentes/admins

**Arquivo:** `src/pages/Dashboard.tsx`

- Usar o `profile.role` vindo de `useCompany()`.
- Criar uma regra de exibição:
  - mostrar o card apenas para `manager` e `admin`
  - esconder para `agent`
- Desabilitar a query de usuários online quando o usuário não tiver permissão, evitando busca desnecessária.
- Ajustar o grid do dashboard para não deixar espaço vazio quando o card estiver oculto.

### Resultado esperado

- O modal de automações passará a mostrar entregues, visualizadas e respondidas com base nas mensagens reais.
- As métricas antigas continuarão aparecendo quando só houver registros legados.
- Atendentes não verão mais o card de “Usuários Online” no Dashboard.
- Gerentes/admins continuarão vendo usuários online normalmente.
