

## Problema

O `dispatchCampaignNow` no `useCampaigns.ts` tem dois problemas:

1. **Payload incompleto**: O payload enviado ao `proxy-n8n` não inclui `company_id`, `type`, `internal_id` — campos que o n8n espera (como visto no print: "company_id is required"). O Inbox envia esses campos via `useMessages.ts`.

2. **Sem intervalo entre mensagens**: O loop de envio dispara todos os contatos sequencialmente sem delay, ignorando o `intervalo_segundos` configurado pelo usuário no formulário.

## Solução

### 1. Corrigir payload do dispatchCampaignNow (`src/hooks/useCampaigns.ts`)

Alinhar o payload com o padrão do `useMessages.ts`:

```typescript
payload: {
  company_id: companyId,  // NOVO - obrigatório no n8n
  number: contact.phone,  // era "phone"
  text: message,           // era "message"
  type: "text",            // NOVO
  internal_id: `campaign-${campaignId}-${contact.id}`, // NOVO
  contact_name: contact.name,
  campaign_id: campaignId,
}
```

A função `dispatchCampaignNow` precisa receber `companyId` como parâmetro adicional.

### 2. Passar `disparoConfig` ao hook e aplicar delay (`src/hooks/useCampaigns.ts` + `src/pages/NewCampaign.tsx`)

- Adicionar parâmetro `intervalSeconds` na interface do `createCampaign`.
- No `NewCampaign.tsx`, passar `disparoConfig.intervalo_segundos` na chamada.
- No loop de envio, adicionar `await sleep(intervalSeconds * 1000)` entre cada contato:

```typescript
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

for (const contact of contactsData) {
  // ... envio ...
  if (intervalSeconds > 0) await sleep(intervalSeconds * 1000);
}
```

### Arquivos impactados
- `src/hooks/useCampaigns.ts` — corrigir payload + adicionar delay
- `src/pages/NewCampaign.tsx` — passar `intervalo_segundos` na chamada

