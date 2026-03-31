

## Análise do Problema

O erro **não é no nosso código** — é no workflow do n8n. O fluxo funciona assim:

1. Nossa app envia payload ao `proxy-n8n` → ✅ funciona
2. n8n recebe e envia mensagem via WhatsApp → ✅ funciona (status PENDING no print)
3. n8n tenta chamar nosso webhook (`HTTP Request3`) para salvar a mensagem no banco → ❌ falha

O erro "JSON parameter needs to be valid JSON" acontece no **nó HTTP Request3 do n8n**, que monta um JSON com expressões template (`{{ $json.key?.id }}`). Isso falha provavelmente porque:
- O conteúdo da mensagem contém `\n` (quebra de linha) ou `{nome}` (chaves literais) que quebram o JSON template do n8n
- O campo extra `campaign_id` no payload pode não estar sendo tratado pelo workflow

### O que podemos corrigir do nosso lado

**1. Resolver variáveis antes do envio** — A mensagem está indo como `"Fala {nome}\nSegue o teste..."` ao invés de `"Fala João\nSegue o teste..."`. As variáveis `{nome}`, `{telefone}`, `{email}` devem ser substituídas pelos dados reais do contato antes de enviar.

**2. O restante é ajuste no n8n** — O workflow precisa tratar corretamente o JSON escaping do campo `message.conversation`. Isso não é algo que possamos corrigir pelo código da aplicação.

### Implementação

**Arquivo: `src/hooks/useCampaigns.ts`**

Na função `dispatchCampaignNow`, antes de enviar cada mensagem, resolver as variáveis do template com os dados do contato:

```typescript
// Buscar contatos com campos adicionais
.select("id, phone, name, email")

// Antes de enviar, resolver variáveis
const resolvedMessage = message
  .replace(/\{nome\}/gi, contact.name || '')
  .replace(/\{telefone\}/gi, contact.phone || '')
  .replace(/\{email\}/gi, contact.email || '');
```

Usar `resolvedMessage` no payload em vez de `message`.

### Sobre o erro no n8n

O workflow n8n precisa ser ajustado para fazer escape correto do conteúdo da mensagem ao montar o JSON do HTTP Request3. Isso é configuração do n8n — o nó deve usar o modo "Fields" em vez de "Using JSON" para evitar problemas com caracteres especiais no corpo da mensagem, ou aplicar `.toJsonString()` nas expressões.

### Arquivo impactado
- `src/hooks/useCampaigns.ts` — resolver variáveis de template por contato antes do envio

