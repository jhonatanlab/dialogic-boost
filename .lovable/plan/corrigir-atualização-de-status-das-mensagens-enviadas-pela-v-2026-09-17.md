# Corrigir atualização de status das mensagens enviadas pela VZaps

## Diagnóstico confirmado

O envio pela VZaps já funciona e o `message_id` da VZaps é salvo no campo `messages.message_id`. Os eventos `ReadReceipt` estão chegando à edge function (`eventType: "ReadReceipt"`, `stateRaw: "Delivered"` / `"Read"`), mas nenhum identificador da mensagem é encontrado (`idCount: 0`), então o status no banco não é atualizado.

## Implementação

1. Adicionar log de diagnóstico temporário no handler de `ReadReceipt` do `webhook-vzaps`, registrando a estrutura completa do payload (nomes de campos, tipos e valores dos identificadores de mensagem, sem telefones, textos ou tokens).
2. Publicar a função com o diagnóstico.
3. Enviar uma mensagem pelo EloChat para o celular conectado e abrir/ler a mensagem no celular, forçando ao menos um `Delivered` e um `Read`.
4. Ler os logs da `webhook-vzaps` para descobrir em qual campo (ou caminho) a VZaps envia o identificador da mensagem.
5. Atualizar o extrator de IDs do `ReadReceipt` para considerar o campo real devolvido pela VZaps.
6. Garantir que `messages.status` só seja atualizado quando o novo status tiver prioridade maior que o atual (já existe `statusPriority`, mas validar o fluxo).
7. Republicar a `webhook-vzaps`, testar no Inbox/DB e remover o log de diagnóstico.

## Limites

- Apenas o handler de recibos (`ReadReceipt`) da VZaps será alterado.
- Os fluxos de envio, recebimento de mensagens e demais provedores permanecem intactos.
- Nenhum dado sensível (telefone, texto, token) será persistido nos logs.
