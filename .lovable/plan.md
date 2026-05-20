## Objetivo

Adicionar na aba **API Automação** (tela WhatsApp / Integrações) um campo para definir o **Instance ID** da empresa, salvando direto na tabela `whatsapp_instances` — para que o nó `Sync Inbound EloChat1` do n8n consiga resolver a empresa pelo identificador enviado e não dê mais 409.

## Onde

Arquivo: `src/pages/WhatsappIntegrations.tsx`, dentro de `<TabsContent value="automation">` (acima do card "Webhooks de Sincronização").

## Mudanças

1. **Novo estado**: `automationInstanceId: string` carregado do registro atual de `whatsapp_instances` da empresa (já temos `companyInstance` no componente).

2. **Carregamento**: no `useEffect` que sincroniza a instância, popular `automationInstanceId` com `companyInstance.instance_id` (ou string vazia).

3. **Nova UI** dentro do card de Webhooks (ou em card próprio acima dele), só visível quando `automationEnabled = true`:

   ```
   ┌─ Identificação da Instância ────────────────────┐
   │ Instance ID *                                   │
   │ [ inst_raizesdosertao____________ ]             │
   │ Identificador enviado pelo fluxo do n8n         │
   │ (campo instance_id) para vincular esta empresa. │
   └─────────────────────────────────────────────────┘
   ```

4. **Persistência**: na ação do botão "Salvar" (já existente), além dos `admin_settings`, fazer um upsert em `whatsapp_instances`:
   - Se já existe registro para `company_id` → `update` apenas `instance_id`, `hash`, `status='connected'`, `updated_at`.
   - Se não existe → `insert` com `company_id`, `user_id`, `company_name`, `instance_id`, `hash = instance_id`, `status='connected'`.
   - Validação: bloquear salvar se `automationInstanceId` estiver vazio (toast de erro).
   - Após salvar: `queryClient.invalidateQueries(["my-whatsapp-instance"])`.

5. **Sem mudanças** em outras telas, edge functions ou schema. A tabela `whatsapp_instances` já tem as colunas necessárias (`instance_id`, `hash`, `company_id`, `user_id`, `company_name`, `status`).

## Validação

1. Abrir Configurações → WhatsApp → aba **API Automação**, ativar o motor.
2. Preencher Instance ID com o mesmo valor que o fluxo do n8n envia (ex.: `inst_raizesdosertao`).
3. Clicar Salvar → toast de sucesso.
4. Conferir no banco: `SELECT instance_id FROM whatsapp_instances WHERE company_id = …`.
5. Enviar mensagem pelo canal — não deve mais aparecer "blocked: instance_id not registered".
