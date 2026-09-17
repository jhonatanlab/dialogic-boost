# Corrigir o envio de mensagens pela conexão VZaps

## O que está acontecendo

O recebimento já funciona. O envio, porém, continua saindo pelo caminho antigo (n8n), que não conhece a VZaps — por isso nada chega ao WhatsApp.

Confirmado nos dados: a empresa ELOHUB tem a conexão VZaps ligada e ativa, mas a chave interna que manda o Inbox usar a rota própria do sistema está desligada. Com ela desligada, o Inbox usa o endereço antigo do n8n para enviar. Nenhum registro de envio pela rota nova apareceu.

## Correção

1. O Inbox passa a decidir a rota pela conexão real da empresa: se existe uma conexão de WhatsApp conectada (VZaps, Zapster ou API nativa), o envio vai pela rota própria do sistema — que já tem o envio VZaps implementado e testado.
2. Só quando a empresa não tiver nenhuma conexão dessas o envio continua pelo caminho antigo (n8n / automação), sem mudar quem já usa isso hoje.
3. Ao confirmar o envio, a mensagem no chat recebe o identificador devolvido pela VZaps, para os avisos de entregue e lido continuarem funcionando.
4. Se o WhatsApp não confirmar, a mensagem aparece como falha com o motivo, sem cair silenciosamente no n8n.

## Validação

- Enviar uma mensagem pelo chat da empresa com VZaps e conferir que ela chega ao celular e fica com o status correto.
- Conferir que empresas que ainda usam a conexão antiga continuam enviando normalmente.

## Detalhes técnicos

- `src/hooks/useMessages.ts`: substituir a condição `companies.ai_pipeline_enabled` por uma consulta a `whatsapp_instances` (`company_id`, `status = 'connected'`, `provider in ('vzaps','zapster','evolution')`). Havendo instância, rotear por `wa-action` → `send-message`; caso contrário manter a cascata atual (automação outbound → `proxy-n8n`).
- Reconciliação: aceitar `message_id` no formato retornado pela VZaps (`data.message_id`) além dos formatos Evolution/Zapster já tratados.
- Verificar que `wa-action` (ação `send_message`) repassa a resposta de `send-message` com `message_id`; ajustar o repasse se estiver perdendo o campo.
- Nenhuma alteração no `send-message` (branch VZaps já validado) nem no `webhook-vzaps`.
