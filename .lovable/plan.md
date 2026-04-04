

## Problema

A função `execute-automation` insere a mensagem no banco (por isso aparece no chat), mas falha ao enviá-la pelo WhatsApp porque busca o endpoint com a chave errada.

**Linha 173** de `execute-automation/index.ts`:
```
.eq("setting_key", "sendMessageEndpoint")  ← não existe no banco
```

A chave correta no banco é `n8n_send_message`.

Como `settings` retorna `null`, o bloco de envio via fetch nunca executa.

## Correção

### Arquivo: `supabase/functions/execute-automation/index.ts`

1. Alterar a query na linha 173 de `"sendMessageEndpoint"` para `"n8n_send_message"`.
2. Adicionar log quando o endpoint não for encontrado, para facilitar debug futuro.
3. Re-deploy da função.

Essa é a única mudança necessária — uma correção de 1 linha.

