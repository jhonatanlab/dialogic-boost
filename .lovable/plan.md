

## Problema

A automação está salva no banco (`automations` table), mas **não existe nenhuma lógica no backend** que verifique mensagens recebidas contra as automações cadastradas. O webhook `webhook-n8n-instance` recebe mensagens inbound, salva no banco, mas nunca consulta a tabela `automations` para verificar keyword ou trigger_type.

Além disso, a automação cadastrada tem `keyword: null` e `trigger_type: first_message` — ou seja, nem a palavra-chave foi salva.

## Plano de implementação

### 1. Corrigir salvamento de keyword/trigger_type na UI

**Arquivo**: `src/pages/Automations.tsx`

- Adicionar campos no formulário do builder para configurar `trigger_type` (dropdown: `keyword`, `first_message`, `all_messages`) e `keyword` (input texto, visível quando trigger_type = keyword).
- Passar esses valores para `createAutomation.mutate()` e `updateAutomation.mutate()`.

### 2. Adicionar motor de execução de automações no webhook

**Arquivo**: `supabase/functions/webhook-n8n-instance/index.ts`

Após o upsert de mensagem inbound (dentro do bloco `if (messageDirection === "inbound")`), adicionar lógica:

```text
1. Consultar automações ativas da empresa:
   SELECT * FROM automations 
   WHERE company_id = X AND status = 'active'

2. Para cada automação, verificar match:
   - trigger_type = 'keyword' → conteúdo da mensagem contém a keyword
   - trigger_type = 'first_message' → é a primeira mensagem do contato (conversation recém-criada)
   - trigger_type = 'all_messages' → sempre dispara

3. Se match, executar o fluxo:
   - Percorrer nodes/edges do flow_data
   - Para nó tipo "message": enviar mensagem via edge function send-message
   - Para nó tipo "delay": agendar próximo passo (simplificado: inline delay)
   - Para nó tipo "condition": avaliar e seguir branch correto
   - Incrementar execution_count e last_execution na automação
```

### 3. Criar edge function dedicada `execute-automation`

**Arquivo**: `supabase/functions/execute-automation/index.ts`

Função separada para executar o fluxo, chamada pelo webhook. Recebe `automation_id`, `contact_id`, `conversation_id`, `company_id`. Percorre o grafo de nodes/edges e executa cada ação sequencialmente.

Ações suportadas inicialmente:
- **message**: envia mensagem de texto ao contato (insere na tabela messages + chama proxy-n8n ou send-message)
- **delay**: aguarda N segundos (limitado a delays curtos; delays longos precisariam de job queue)
- **question**: envia mensagem e aguarda resposta (v1: apenas envia, sem aguardar)

### 4. Vincular trigger no webhook

**Arquivo**: `supabase/functions/webhook-n8n-instance/index.ts`

No final do bloco `upsert_message` para mensagens inbound, chamar a nova função `execute-automation` via fetch interno do Supabase.

### Arquivos impactados

| Arquivo | Mudança |
|---|---|
| `src/pages/Automations.tsx` | Campos keyword/trigger_type no builder |
| `supabase/functions/execute-automation/index.ts` | Nova edge function — motor de execução |
| `supabase/functions/webhook-n8n-instance/index.ts` | Trigger de automação em mensagens inbound |

### Limitações da v1
- Delays longos (> 30s) não funcionarão inline — precisariam de job scheduling futuro
- Nós de "pergunta" apenas enviam a mensagem, sem aguardar resposta
- Condições avaliam apenas regras simples (contém texto, tag do contato)

