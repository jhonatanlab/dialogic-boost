# Corrigir envio das mensagens de automação pela VZaps

## Diagnóstico confirmado

A rotina que executa as automações ainda envia as mensagens pelo caminho antigo (endereço de automação do n8n). Quando esse endereço não existe ou responde erro, a mensagem é marcada como falha. A conexão VZaps ativa não é consultada em nenhum momento nesse fluxo — diferente do Inbox, que já foi corrigido para usar a conexão conectada.

## Correção

1. Antes de enviar, verificar se a empresa tem uma conexão ativa (VZaps, Zapster ou Evolution).
2. Havendo conexão ativa, enviar pela mesma rotina de envio usada pelo Inbox, que já conhece a VZaps, e gravar o identificador retornado para os status de entregue/lida funcionarem.
3. Sem conexão ativa, manter o caminho antigo do n8n como está hoje (compatibilidade com quem usa n8n).
4. Marcar como falha somente quando o envio realmente falhar, com o motivo registrado.
5. Publicar a rotina de automações e validar com uma automação real: mensagem sai no WhatsApp e aparece como enviada no chat.

## Detalhes técnicos

- `supabase/functions/execute-automation/index.ts`, nó `message`/`question`: consultar `whatsapp_instances` por `company_id`, `status='connected'`, `provider in ('vzaps','zapster','evolution')`; se houver, invocar `send-message` (service role) em vez do `fetch` no endpoint n8n; extrair `message_id` da resposta e atualizar `messages` (`status='sent'`, `message_id`).
- Sem instância conectada: fluxo n8n atual inalterado.
- Escopo: apenas esta função. Inbox, campanhas e demais provedores permanecem intactos.
