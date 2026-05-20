## Causa raiz

A Kaline aparece duas vezes porque os dois webhooks gravaram o telefone em formatos diferentes:

- `webhook-leads` (cadastro Facebook Lead Ads) salvou `5587996221373` (13 dígitos, **com** o 9).
- `webhook-n8n-instance` (resposta vinda do WhatsApp) recebeu `558796221373` (12 dígitos, **sem** o 9) e, como a busca por telefone é `eq` exato, não achou o contato existente → criou outro contato e outra conversa.

Confirmei no banco: dois `contacts` distintos para a mesma pessoa, dois `conversations` abertos. Esse é o clássico problema do "9 do celular brasileiro".

## O que vamos mudar

Apenas duas Edge Functions, sem mudança de schema, sem mexer em outras telas/fluxos.

### 1. `supabase/functions/webhook-leads/index.ts`

- Adicionar helper `brazilPhoneVariants(digits)` que devolve as variantes possíveis do número:
  - sempre a versão "como veio";
  - se for BR celular 13 dígitos `55 + DDD + 9XXXXXXXX`, também a versão de 12 dígitos sem o 9;
  - se for BR 12 dígitos `55 + DDD + XXXXXXXX` com DDD de celular, também a versão com o 9 inserido.
- Trocar a busca do contato:
  ```
  .eq("phone", telefone) → .in("phone", variants)
  ```
- Se achar o contato pela variante alternativa, atualizar `phone` para a forma canônica (13 dígitos com 9) para estabilizar buscas futuras.

### 2. `supabase/functions/webhook-n8n-instance/index.ts`

- Mesmo helper `brazilPhoneVariants`.
- Em `findOrCreateContact`, substituir `.eq("phone", normalizedPhone)` por `.in("phone", variants)`.
- Quando achar via variante, manter o `phone` já existente (não sobrescrever com a versão sem 9 que veio do WhatsApp).

### Por que isso resolve

- Quando o lead chega primeiro (com 9) e depois o WhatsApp responde (sem 9), o `findOrCreateContact` agora encontra o contato existente → reutiliza a mesma `conversation`.
- Quando o WhatsApp inicia primeiro (sem 9) e depois vira lead (com 9), o `webhook-leads` também encontra o contato existente e normaliza para 13 dígitos.

## Limpeza dos duplicados já existentes

Para a Kaline (e qualquer outro caso já criado antes do fix), depois de aprovar e aplicar o plano eu posso, em um passo seguinte:

1. Listar pares de contatos duplicados por variante 12/13.
2. Migrar mensagens/conversa do duplicado mais novo para o original.
3. Apagar o duplicado via `delete_contact_cascade`.

Isso fica fora deste plano para você revisar antes de tocar em dados.

## Validação

1. Após deploy: enviar um lead de teste via webhook com `5587999999999` e em seguida simular uma mensagem entrando via `webhook-n8n-instance` com `558799999999` → deve cair na **mesma** conversa.
2. Conferir no banco: 1 contato, 1 conversa.
3. Nenhum impacto em mensagens já existentes (apenas a lookup muda).
