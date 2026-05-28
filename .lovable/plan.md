## Objetivo
Exibir a **origem** de cada contato (campo `contacts.source` já existente no banco) tanto na **lista de contatos** quanto no **painel de detalhes**.

## Contexto
A coluna `source` já é populada com valores como:
- `whatsapp` (245)
- `Facebook Lead Ads - 04 [...] [CAMPANHA DE CADASTRO] [RESIDENCIAL]` (17)
- `landing-page-dls` (3)
- etc.

Hoje esse dado **não é exibido em nenhum lugar da UI**. Apenas precisamos renderizá-lo.

## Mudanças

### 1. `src/hooks/useContacts.ts`
- Adicionar `source?: string` na interface `Contact` (o `select("*")` já traz o campo, só falta tipar).

### 2. Lista de contatos (`src/pages/Contacts.tsx`)
- Adicionar uma **badge "Origem"** ao lado/abaixo do nome de cada contato.
- Aplicar uma normalização visual:
  - `whatsapp` → badge "WhatsApp" (verde)
  - `manual` → badge "Manual" (cinza)
  - `landing-page-*` → badge "Landing Page" (azul)
  - `Facebook Lead Ads*` → badge "Facebook Ads" (azul Facebook) + tooltip com o nome completo da campanha
  - outros → badge com o próprio valor truncado + tooltip completo
- Usar tokens do design system (sem cores hardcoded).

### 3. Detalhes do contato (`src/components/contacts/ContactDetails.tsx`)
- Adicionar uma linha **"Origem"** no bloco de informações, mostrando o valor completo de `source` (sem truncar).
- Se `source` for nulo, exibir "Não informada".

## Fora do escopo
- Não alterar webhooks/ingestão (a origem já é gravada corretamente).
- Não criar nova tabela nem nova coluna.
- Não adicionar filtro por origem na lista (pode ser feito depois se pedido).
