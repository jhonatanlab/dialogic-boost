

## Plano: Corrigir envio de mensagens para respeitar a integração ativa

### Problema
O hook `useMessages.ts` (linhas 97-103) sempre busca o setting `n8n_send_message` (API Nativa) e envia via `proxy-n8n`, ignorando completamente se a API Automação está ativa. Não há verificação de `n8n_automation_enabled` nem uso de `n8n_automation_outbound`.

### Correção

**Arquivo: `src/hooks/useMessages.ts`** (linhas 97-107)

Substituir a lógica de resolução do endpoint por uma cadeia de prioridade que respeita a integração ativa:

1. Buscar `n8n_automation_enabled` e `n8n_automation_outbound` filtrados por `company_id`
2. Se `n8n_automation_enabled === "true"` e `n8n_automation_outbound` tiver valor, usar esse endpoint diretamente (sem `proxy-n8n`, pois é um endpoint externo direto)
3. Senão, cair no fallback atual de `n8n_send_message` via `proxy-n8n`

A query atual não filtra por `company_id`, o que também é um bug — se existirem múltiplas empresas, pode pegar o setting errado. A correção inclui adicionar `.eq("company_id", companyId)`.

### Lógica proposta (pseudocódigo)

```text
1. SELECT setting_key, setting_value FROM admin_settings 
   WHERE company_id = :companyId 
   AND setting_key IN ('n8n_automation_enabled', 'n8n_automation_outbound', 'n8n_send_message')

2. Se automation_enabled === 'true' E automation_outbound existe:
   → POST direto para automation_outbound com o payload padrão
   
3. Senão se n8n_send_message existe:
   → POST via proxy-n8n para n8n_send_message (comportamento atual)
   
4. Senão:
   → Erro: nenhuma integração configurada
```

### Arquivos modificados
- `src/hooks/useMessages.ts` — reescrever linhas 97-117 com a cadeia de prioridade

### Resultado esperado
- Ao ativar API Automação, mensagens são enviadas pelo endpoint outbound configurado
- Ao desativar API Automação, volta a usar API Nativa normalmente
- Sem conflito entre as duas integrações

