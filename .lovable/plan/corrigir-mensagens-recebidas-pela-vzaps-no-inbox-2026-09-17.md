# Corrigir mensagens recebidas pela VZaps no Inbox

## Diagnóstico confirmado

Os registros mostram que a VZaps está entregando o evento `Message` dentro de `json_data.event`, com telefone em `info.sender_alt` e texto em `message.conversation`. O recebimento reconhece o nome do evento, mas continua procurando `info` e `message` fora desse envelope. Assim, considera que faltam o identificador ou o telefone e encerra sem criar contato, conversa ou mensagem. As consultas também confirmam que nenhuma mensagem VZaps recente foi gravada.

## Implementação

1. Ajustar a leitura do webhook para desembrulhar corretamente `json_data.event`, preservando compatibilidade com os outros formatos já aceitos.
2. Usar o objeto desembrulhado de forma consistente para evento, `info`, conteúdo, remetente alternativo, horário, mídia e recibos de leitura.
3. Manter a proteção atual contra a primeira cópia incompleta que contém somente o identificador `@lid`, processando a cópia seguinte com `sender_alt`.
4. Não registrar o corpo completo nem tokens; adicionar apenas registros seguros do resultado quando uma mensagem for processada ou ignorada.
5. Publicar a função de recebimento e validar com uma mensagem real: confirmar a criação do contato/conversa/mensagem e sua exibição imediata no Inbox, sem duplicidade.

## Limites

- A alteração ficará restrita ao recebimento da VZaps.
- O envio por VZaps, Zapster, Evolution e N8N não será alterado.
