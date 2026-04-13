

## Plano: API Nativa deve mostrar "Desconectado" quando API Automação estiver ativa

### Problema identificado
Quando o toggle "API Automação" é ativado, o código tenta deletar o registro da `whatsapp_instances` (linha 652-655) para desativar a API Nativa. Porém, o registro **continua existindo** no banco — confirmei que a instância `inst_6e6a75bf-1766-4748-bbcd-f6c37823557f` com `status: connected` ainda está lá, mesmo com `n8n_automation_enabled = true`.

Isso faz com que o badge da aba "API Nativa" continue mostrando "Conectado ✅", pois ele verifica `companyInstance?.status === 'connected'` diretamente do banco.

### Causa raiz
O delete pode estar falhando silenciosamente (RLS ou erro não capturado). Além disso, mesmo que o delete funcione no futuro, a abordagem de **deletar a instância** para desativar a API Nativa é frágil — o usuário perde configurações de conexão.

### Correção proposta

**Arquivo: `src/pages/WhatsappIntegrations.tsx`**

1. **No toggle da API Automação (linhas 651-655)**: Em vez de deletar o registro da `whatsapp_instances`, apenas atualizar o `status` para `'disconnected'`. Isso preserva as credenciais caso o usuário queira reativar a API Nativa depois:
   ```
   UPDATE whatsapp_instances SET status = 'disconnected' WHERE company_id = :companyId
   ```

2. **No toggle da API Nativa (linhas 460-468)**: Já está correto — desativa a automação via `admin_settings`. Adicionar também a reconexão da instância (update status para `'connected'`) se o registro existir.

3. **No badge da aba API Nativa (linhas 258-270)**: Adicionar verificação extra — se `automationEnabled === true`, forçar exibição como "Inativo" independente do status da instância, garantindo consistência visual.

4. **Migração de dados**: Atualizar o registro existente para `status = 'disconnected'` já que a API Automação está ativa agora.

### Arquivos modificados
- `src/pages/WhatsappIntegrations.tsx` — ajustar toggles e badge
- Nova migration — corrigir dado existente e mudar delete para update

### Resultado esperado
- Ao ativar API Automação, a aba "API Nativa" mostra "Desconectado" ou "Inativo"
- Ao reativar API Nativa, o status volta para "connected" e API Automação é desativada
- Credenciais da instância não são perdidas ao alternar entre provedores

