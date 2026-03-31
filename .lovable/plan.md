

## Problemas identificados

### 1. Input do Inbox usa `<Input>` (single-line)
O campo de mensagem no Inbox (linha 1148) usa o componente `<Input>` que é um `<input type="text">` — não aceita quebra de linha. Precisa ser trocado por `<Textarea>` que já é importado no arquivo.

### 2. Quebra de linha causa erro no n8n
Quando a mensagem contém `\n`, o n8n monta um JSON com expressões template que quebram ao encontrar newlines literais dentro de strings JSON. O campo `message.conversation` no print mostra `Fala Jhonatan França\n Segue o teste...` — o `\n` literal quebra o JSON do nó HTTP Request3.

A solução do nosso lado é escapar as quebras de linha antes de enviar ao n8n, convertendo `\n` para `\\n` no payload para que o JSON seja válido. Na verdade, como usamos `JSON.stringify` no `proxy-n8n`, o problema não está no nosso proxy — está no workflow do n8n que monta JSON manualmente com template expressions. Do nosso lado, podemos mitigar enviando a mensagem sem newlines literais problemáticos, ou melhor, garantir que o texto é passado limpo.

Analisando melhor: o `proxy-n8n` já usa `JSON.stringify(payload)` corretamente. O problema é que o n8n, ao repassar para o webhook `upsert_message`, monta o body JSON com template expressions (`{{ $json.message.conversation }}`). Se o valor contiver `\n`, o JSON template fica inválido.

**Solução**: no `useCampaigns.ts` e no `useMessages.ts` (envio pelo Inbox), não precisamos mudar nada no envio — o JSON é válido. O problema é exclusivamente na configuração do n8n. Porém, podemos ajudar adicionando resiliência no `webhook-n8n-instance` para aceitar payloads com problemas de encoding.

## Plano

### Alteração 1: Trocar `<Input>` por `<Textarea>` no Inbox
**Arquivo: `src/pages/Inbox.tsx`** (linha 1148)

Substituir o `<Input>` por `<Textarea>` com auto-resize, mantendo o comportamento de Enter=enviar e Shift+Enter=nova linha:

```tsx
<Textarea 
  placeholder="Digite uma mensagem" 
  value={messageInput}
  className="min-h-[44px] max-h-[120px] rounded-xl bg-secondary border-0 pr-12 text-sm resize-none"
  onChange={(e) => setMessageInput(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  }}
  rows={1}
/>
```

### Alteração 2: Escapar `\n` no texto de campanhas antes do envio
**Arquivo: `src/hooks/useCampaigns.ts`** (após resolver variáveis, linha ~94)

Converter quebras de linha para o formato que o WhatsApp e o n8n entendem sem quebrar JSON templates:

```typescript
const resolvedMessage = message
  .replace(/\{nome\}/gi, contact.name || '')
  .replace(/\{telefone\}/gi, contact.phone || '')
  .replace(/\{email\}/gi, (contact as any).email || '');
// Não precisa alteração aqui - o JSON.stringify já escapa corretamente
```

Na verdade, o problema real é no n8n. Do nosso lado, o `JSON.stringify` já gera JSON válido. A solução definitiva é no workflow n8n: o nó HTTP Request3 deve usar modo **"Fields"** em vez de **"Using JSON"** para que o n8n faça o escaping automaticamente.

**Porém**, como paliativo do nosso lado, podemos tornar o `webhook-n8n-instance` mais resiliente ao receber o body, tentando reparar JSON malformado.

### Alteração 3: Tornar `webhook-n8n-instance` resiliente a JSON com newlines
**Arquivo: `supabase/functions/webhook-n8n-instance/index.ts`**

No parsing do body, antes do `JSON.parse`, sanitizar o texto raw removendo newlines literais dentro de strings JSON:

```typescript
const rawText = await req.text();
// Tentar parse normal primeiro, se falhar, tentar sanitizar
let body;
try {
  body = JSON.parse(rawText);
} catch {
  // Tentar corrigir newlines não-escapados dentro de strings JSON
  const sanitized = rawText.replace(/[\n\r\t]/g, (match) => {
    if (match === '\n') return '\\n';
    if (match === '\r') return '\\r';
    if (match === '\t') return '\\t';
    return match;
  });
  body = JSON.parse(sanitized);
}
```

## Resumo
| Arquivo | Mudança |
|---|---|
| `src/pages/Inbox.tsx` | `Input` → `Textarea` com auto-resize e Shift+Enter |
| `supabase/functions/webhook-n8n-instance/index.ts` | Parsing resiliente para JSON com newlines |

**Nota importante sobre n8n**: A causa raiz do erro de JSON está no nó HTTP Request3 do workflow n8n, que usa modo "Using JSON" com template expressions. A recomendação é trocar para modo **"Fields"** (ou "Keypair") no n8n para que valores com caracteres especiais sejam escapados automaticamente. A alteração no webhook é um fallback de segurança.

