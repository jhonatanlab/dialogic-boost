# Diagnosticar e corrigir o formato real do webhook VZaps

## Diagnóstico confirmado

O novo teste chegou à função às 10:23:36, mas foi classificado novamente com o evento vazio. Nenhum registro foi criado em mensagens recebidas, mensagens ou conversas. Portanto, o problema continua antes da gravação no Inbox: o formato do novo evento não corresponde ao envelope tratado atualmente.

## Implementação

1. Adicionar diagnóstico temporário seguro que registre somente nomes de campos, tipos e níveis do envelope recebido, sem tokens, telefones, textos ou conteúdo da mensagem.
2. Publicar essa instrumentação e capturar uma nova chamada da VZaps para identificar o formato exato entregue atualmente.
3. Ajustar o desembrulhamento para aceitar esse formato, inclusive quando `json_data` ou `event` vierem como texto JSON, objeto aninhado ou estrutura alternativa.
4. Manter a regra que descarta a cópia incompleta `@lid` e processa a cópia com o telefone em `sender_alt`.
5. Remover o diagnóstico temporário, publicar a versão final e validar no banco e no Inbox que contato, conversa e mensagem foram criados sem duplicidade.

## Limites

- Somente o recebimento da VZaps será alterado.
- Nenhum token, telefone ou conteúdo será exposto nos registros.
- Os fluxos de envio e os demais provedores permanecerão intactos.
