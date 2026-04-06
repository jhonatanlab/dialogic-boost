

## Plano: Backend funcional para aba "API Automação"

### Situação atual
A aba "API Automação" é apenas visual — o botão "Salvar" exibe um toast mas não persiste nada. Não há leitura dos valores salvos nem integração com o motor de execução.

### O que será feito

**1. Persistência dos endpoints no banco (frontend)**
- Salvar os campos Inbound/Outbound e o toggle de ativação na tabela `admin_settings` existente, usando as chaves:
  - `n8n_automation_enabled` → "true" / "false"
  - `n8n_automation_inbound` → URL do webhook de recebimento
  - `n8n_automation_outbound` → URL do endpoint de envio
- Os registros serão salvos com `company_id` do usuário logado (mesmo padrão da API Nativa)
- Ao abrir a aba, carregar os valores existentes do banco para popular os campos

**2. Atualizar `useAdminSettings.ts`**
- Adicionar as 3 novas chaves ao array `SETTING_KEYS`

**3. Atualizar `WhatsappIntegrations.tsx`**
- No `useEffect`, carregar os valores salvos da `admin_settings` para popular `automationEnabled`, `automationInbound` e `automationOutbound`
- No botão Salvar, chamar upsert na `admin_settings` com `company_id`

**4. Atualizar `execute-automation/index.ts`** (edge function)
- Antes de buscar o endpoint global `n8n_send_message`, verificar se existe `n8n_automation_outbound` para aquela `company_id`
- Se existir e `n8n_automation_enabled` = "true", usar esse endpoint customizado em vez do global
- Caso contrário, seguir o fluxo atual (fallback para endpoint global)

**5. Atualizar `webhook-n8n-instance/index.ts`** (edge function)
- No processamento de mensagens inbound, verificar se a empresa tem `n8n_automation_inbound` configurado
- Se sim, encaminhar/considerar esse endpoint para o roteamento da mensagem recebida

### Arquivos impactados
- `src/pages/WhatsappIntegrations.tsx` — persistência real no save + load no mount
- `src/hooks/useAdminSettings.ts` — novas chaves
- `supabase/functions/execute-automation/index.ts` — lookup do endpoint customizado
- `supabase/functions/webhook-n8n-instance/index.ts` — roteamento inbound customizado

### Resultado
- Endpoints salvos por empresa no banco
- Motor de automação usa endpoint exclusivo do cliente quando configurado
- Fallback para o fluxo global quando não há endpoint customizado

