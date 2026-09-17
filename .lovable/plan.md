# Atualizar os status das mensagens enviadas pela VZaps

## O que está acontecendo

O envio já funciona: a última mensagem saiu às 13:31 e ficou com o identificador do WhatsApp gravado. Mas ela permanece como "enviada" — não avançou para "entregue" nem "lida".

Nos registros do recebimento, logo depois do envio chegaram vários eventos às 13:32 sem nenhum registro de atualização. Ainda não sabemos em qual formato a VZaps manda essas confirmações, então a leitura atual não encontra a mensagem correspondente. Isso ainda não está confirmado — por isso o primeiro passo é capturar o formato real.

## Correção

1. Ligar um registro temporário só para as confirmações de entrega e leitura, mostrando a estrutura do evento (nomes dos campos, o estado informado e os identificadores) — sem telefone, texto ou tokens.
2. Ampliar a leitura para reconhecer as confirmações mesmo quando vêm com nomes ou níveis diferentes, e para localizar a mensagem pelo identificador do WhatsApp em qualquer dos formatos usados.
3. Manter a regra de nunca voltar um status para trás: entregue não substitui lida.
4. Depois de validar com uma mensagem real, remover o registro temporário e publicar a versão final.

## Validação

- Enviar uma mensagem pelo chat, aguardar a leitura no celular e conferir que ela passa de enviada para entregue e depois lida.
- Conferir no banco que o status da mensagem acompanha a mudança.

## Detalhes técnicos

- `supabase/functions/webhook-vzaps/index.ts`, ramo `ReadReceipt`: hoje só lê `state` e `MessageIDs|message_ids|messageIds|MessageID|message_id|id` no nível já desembrulhado, e retorna sem log — daí a ausência de diagnóstico.
- Ampliar a extração de estado (`state`, `State`, `status`, `ack`, aceitando também variações minúsculas e códigos numéricos de ack) e de identificadores (`ids`, `keys[].id`, `info.id`, `Info.ID`, `key.id`, `message.id`, além dos atuais), reaproveitando `findEventPayload` para desembrulhar `json_data`/`data`/`event`.
- Fallback de correspondência: além de `messages.message_id`, tentar `client_message_id` quando o identificador não bater.
- Log temporário `[webhook-vzaps] receipt debug` com `{ eventType, stateRaw, idKeys, rootKeys }`.
- Republicar apenas `webhook-vzaps`; nenhuma mudança em `send-message` nem no frontend.
