

## Diagnóstico

Há **dois problemas** a resolver:

### 1. Erro na Edge Function: "Unexpected end of JSON input"
A edge function `webhook-n8n-instance` falha na linha `const body = await req.json()` porque o body da requisição chega vazio. Isso acontece porque o n8n pode estar enviando a requisição de uma forma que o body não chega corretamente (redirects, encoding, etc.). A correção é tornar a edge function mais resiliente, tratando bodies vazios/malformados com um try-catch ao redor do `req.json()` e retornando um erro 400 claro ao invés de um 500 genérico.

### 2. Erro de build: `WhatsappIntegrations.tsx(496,1): TS1128`
O arquivo atual parece correto (498 linhas, sintaxe válida). Este erro pode ser de um estado de cache. Será verificado e corrigido se necessário.

---

## Plano de Implementação

### Passo 1 — Tornar a Edge Function resiliente a bodies vazios
**Arquivo:** `supabase/functions/webhook-n8n-instance/index.ts`

- Envolver `req.json()` em um try-catch dedicado
- Se o body estiver vazio ou não for JSON válido, retornar erro 400 com mensagem clara: `"Invalid or empty request body. Send a JSON with 'action' and 'data' fields."`
- Adicionar log do content-type e content-length para debug
- Adicionar suporte a leitura do body como texto antes de parsear, para diagnosticar o que está chegando

```typescript
// Antes do parse:
const rawBody = await req.text();
console.log("Raw body received:", rawBody?.substring(0, 500));

if (!rawBody || rawBody.trim() === "") {
  return new Response(
    JSON.stringify({ error: "Empty request body" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

let body;
try {
  body = JSON.parse(rawBody);
} catch {
  return new Response(
    JSON.stringify({ error: "Invalid JSON in request body" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### Passo 2 — Verificar e corrigir erro de build no WhatsappIntegrations
- Verificar o arquivo completo para encontrar o erro de sintaxe na linha 496
- Corrigir se houver problema real

---

## Nota sobre o N8N
Após a correção, a edge function retornará uma mensagem de erro mais clara (400 em vez de 500), o que facilitará diagnosticar se o problema está na configuração do n8n (body não sendo enviado). Se o erro persistir no n8n, a mensagem de log no edge function mostrará exatamente o que está chegando.

