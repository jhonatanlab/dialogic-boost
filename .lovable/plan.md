

## Problema

Quando a automação envia uma mensagem, o fluxo é:
1. `execute-automation` insere mensagem com `client_message_id=app-xxx` e `message_id=null` para o contato correto (phone `558388907220`)
2. n8n envia pelo WhatsApp e recebe o `message_id` oficial (`3EB0xxx`)
3. n8n envia callbacks de status via `update_message_status` com `message_id=3EB0xxx` e `phone_number=108744461565976`

O problema: `108744461565976` é o número da **instância WhatsApp** (remetente), não do destinatário. O `update_message_status` não encontra nenhuma mensagem com esse `message_id` (porque a mensagem original ainda tem `message_id=null`), então vai para o caminho de fallback: cria um contato novo com o número errado e uma conversa fantasma.

A reconciliação via `upsert_message` (que vincula `internal_id → message_id`) ou não acontece ou chega depois dos callbacks de status.

## Correção

### 1. `webhook-n8n-instance/index.ts` — `update_message_status`

Antes de criar contato/conversa pelo `phone_number`, adicionar uma etapa de reconciliação:
- Quando `message_id` não é encontrado no banco, buscar mensagens outbound recentes (últimos 2 min) com `message_id IS NULL` na mesma `company_id`
- Se encontrar exatamente uma, reconciliar: atribuir o `message_id` oficial e atualizar o status
- Isso evita completamente a criação de contatos fantasmas

A lógica específica:
```
1. Buscar mensagens WHERE company_id = X AND direction = 'outbound' 
   AND message_id IS NULL AND created_at > (now - 2 min)
   ORDER BY created_at DESC LIMIT 5
2. Se encontrar candidatas, vincular message_id e atualizar status
3. Somente se NÃO encontrar candidatas, seguir o fluxo atual de phone_number
```

### 2. Proteção adicional contra números de instância

Adicionar uma verificação: se o `phone_number` do callback bater com o número da instância WhatsApp da empresa (tabela `whatsapp_instances`), ignorar a criação de contato — é claramente o número do remetente, não do destinatário.

### Arquivos impactados
- `supabase/functions/webhook-n8n-instance/index.ts` (update_message_status action)

### Resultado esperado
- Callbacks de status reconciliam com a mensagem original da automação
- Nenhum contato fantasma é criado com o número da instância
- Status (sent/delivered/read) atualiza corretamente na mensagem original

