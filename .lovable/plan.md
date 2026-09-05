# Por que as mensagens "não saem" do EloChat

## O que os registros mostram (verificado agora)

Nas suas últimas tentativas (hoje, 02:20–02:24 de Brasília), na conta Raízes do Sertão:

- 02:20 — o WhatsApp conectado recusou o envio com "Connection Closed" (conexão do aparelho/instância caiu). O sistema então repassou a mensagem para o fluxo antigo do n8n, que respondeu apenas "fluxo iniciado" — e mesmo assim a mensagem foi marcada como **enviada** na tela, sem nenhum código de confirmação do WhatsApp.
- 02:22 e 02:24 — os envios foram aceitos pelo WhatsApp e voltaram com código de confirmação.

Ou seja: há duas coisas distintas acontecendo.

1. A conexão do WhatsApp dessa conta cai de forma intermitente. Quando cai, a mensagem não chega ao destinatário.
2. Quando isso acontece, o EloChat **mente para você**: mostra "enviada" mesmo sem confirmação, porque há um desvio automático para o fluxo antigo e o status é gravado como enviado de qualquer forma. Também nenhuma mensagem enviada evolui para "entregue"/"lida", então não há como saber pela tela se chegou.

Além disso, as outras duas contas (DLS Energia Solar e Elo Hub) continuam enviando pelo fluxo externo do n8n, que só informa "fluxo iniciado" — nunca confirma entrega.

## O que fazer

### 1. Confirmar o estado da conexão do WhatsApp
Checar o estado real da conexão dessa conta e, se estiver fora, reconectar pelo QR Code. Sem isso, nenhum ajuste de código faz mensagem chegar.

### 2. Parar de marcar como "enviada" o que não foi confirmado
- Só marcar como enviada quando vier um código de confirmação do WhatsApp.
- Sem confirmação: marcar como **falha**, com o motivo real visível na conversa (hoje já existe o botão de reenviar).

### 3. Remover o desvio silencioso
Quando a conta usa o WhatsApp próprio (conexão direta) e o envio falha, mostrar o erro em vez de mandar pelo fluxo antigo do n8n às escondidas — é isso que hoje esconde o problema e gera "mandei e não chegou".

### 4. Mostrar quando a conexão está fora
Aviso no topo da conversa quando a conexão do WhatsApp da empresa não estiver ativa, com atalho para reconectar, e bloqueio do envio nesse estado.

### 5. Atualizar "entregue" e "lida"
Garantir que as confirmações que chegam do WhatsApp atualizem o status das mensagens enviadas, para você ver na hora se chegou.

### 6. Testar
Enviar uma mensagem de teste com a conexão ativa (deve aparecer enviada → entregue) e uma com a conexão fora (deve aparecer falha com motivo, e não "enviada").

## Detalhes técnicos

- `supabase/functions/send-message/index.ts`: o `try/catch` do bloco Evolution cai para Meta/Z-API/`n8n_automation_outbound` em qualquer erro. Restringir o fallback: se existe instância Evolution `connected` para a empresa, o erro deve ser propagado (HTTP 502) com a mensagem da Evolution, sem fallback.
- `src/hooks/useMessages.ts` (trecho `nativePipeline`): hoje faz `update status:'sent'` mesmo quando `waId` é nulo. Passar a gravar `failed` + `metadata.error` quando não houver `key.id`.
- `supabase/functions/webhook-evolution/index.ts`: verificar tratamento de `messages.update` (ACK) para promover `sent → delivered → read` conforme a hierarquia de status já definida no projeto.
- Banner de conexão: consultar `whatsapp_instances.status` da empresa (mais o endpoint de estado da Evolution via `test-evolution-connection`) no `Inbox`.
- Contas com `ai_pipeline_enabled = false` (DLS, Elo Hub) permanecem no caminho n8n; nesses casos o status continua sem confirmação real de entrega — tratado como limitação conhecida, salvo pedido de migração para conexão direta.
