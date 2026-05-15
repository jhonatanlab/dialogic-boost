# Corrigir formato do número no webhook-leads (faltando DDI 55)

## Diagnóstico

O formulário envia `whatsapp: "(83) 98890-7220"`. A função normaliza para `83988907220` (11 dígitos, sem DDI). O n8n recebe esse número, busca no WhatsApp e retorna `exists: false` → 400 Bad Request.

As Automações funcionam porque usam `contact.phone` que já está salvo com `55` na frente (ex: `5583988907220`).

## Correção

Em `supabase/functions/webhook-leads/index.ts`, após normalizar o telefone, adicionar uma função `ensureBrazilCountryCode()`:

- Se já começa com `55` e tem 12-13 dígitos → mantém
- Se tem 10 ou 11 dígitos (formato BR local: DDD + número) → prefixa `55`
- Caso contrário → mantém como está (números internacionais ficam intactos)

Esse mesmo número formatado é usado em:
1. `contacts.phone` (insert/lookup) — fica consistente com contatos criados pela inbox/automação
2. `payload.number` enviado ao n8n — passa a vir como `5583988907220`
3. Substituição da variável `{telefone}` na welcome_message

Apenas a edge function `webhook-leads` será alterada. Nada de UI ou banco.