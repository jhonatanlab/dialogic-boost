# Corrigir status das mensagens (VZaps)

## O que os registros mostraram

Os avisos de "entregue" e "lida" chegam certos e no horário. O que falta é o identificador da mensagem: ele vem dentro de um nível interno do aviso (`event`) e com o nome escrito de outra forma (`message_i_ds`), enquanto o recebimento procura por ele no nível de fora. Resultado: `idCount: 0` e nenhuma mensagem atualizada.

## Correção

1. Ler os identificadores também no nível interno do aviso, aceitando a grafia `message_i_ds` (além das já suportadas), seja lista de textos ou de objetos.
2. Ler o estado ("Delivered"/"Read") no nível de fora e no interno, mantendo o mapeamento atual e a regra de nunca voltar um status para trás (entregue não substitui lida).
3. Manter a busca da mensagem pelo identificador do WhatsApp e, se não achar, pelo identificador interno.
4. Depois de validar com uma mensagem real, remover o registro temporário de diagnóstico e publicar a versão final.

## Detalhes técnicos

Em `supabase/functions/webhook-vzaps/index.ts`, ramo `ReadReceipt`:
- criar `receipt = data?.event ?? data?.Event ?? data` (via `parseJsonValue`) e coletar IDs de `receipt` e de `data`;
- incluir as chaves `message_i_ds`, `MessageIDs`, `message_ids`, `messageIds`, `ids`, `IDs`, `keys[].id`, `MessageID`, `message_id`, `id`, `key.id`, `info.id`, `message.key.id`;
- estado: `data.state ?? receipt.state ?? receipt.type ?? ...`, normalização atual mantida; `read_self`/`played` continuam ignorados;
- `statusPriority` inalterado; atualizar `messages.status` só quando o novo status for superior;
- publicar apenas `webhook-vzaps`.

## Validação

Enviar uma mensagem pelo chat, abrir no celular e confirmar no Inbox a mudança de "enviada" para "entregue" e depois "lida"; conferir nos registros `updated > 0`.
