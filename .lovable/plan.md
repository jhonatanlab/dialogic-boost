

## Dois problemas identificados

### Problema 1: Imagem não é enviada nas campanhas
O `dispatchCampaignNow` em `useCampaigns.ts` envia apenas `text` e `type: "text"`. Quando o template selecionado tem `attachment_url`, esses dados são ignorados. O `NewCampaign.tsx` passa apenas `message` (texto), sem `attachment_url`, `type` ou `mimetype` do template.

Comparando com o Inbox (`useMessages.ts`), o envio de mídia inclui `media_url`, `mimetype`, `file_name` e `type` correto no payload.

### Problema 2: Métricas do modal não atualizam
O `campaign_contacts` tem status `pending` → `sent` (quando enviado) ou `failed`. Porém, quando o n8n recebe o status de `delivered`, `read` etc. via webhook (`webhook-n8n-instance`), ele atualiza apenas a tabela `messages` — nunca atualiza `campaign_contacts`. Logo, os contadores de "Entregues", "Lidos" e "Respostas" ficam sempre zerados.

---

## Plano de correção

### 1. Passar dados de mídia do template para o envio
**Arquivo: `src/pages/NewCampaign.tsx`** (onSubmit, ~linha 142)

Incluir `attachmentUrl` e `templateType` do template selecionado na chamada `createCampaignAsync`:

```typescript
const selectedTemplate = templates?.find(t => t.id === data.modelo_disparo);
await createCampaignAsync({
  name: data.nome_campanha,
  message: selectedTemplate?.message || data.modelo_disparo,
  contactIds: publico.filtros,
  scheduledAt: ...,
  intervalSeconds: disparoConfig.intervalo_segundos,
  attachmentUrl: selectedTemplate?.attachment_url || undefined,
  mediaType: selectedTemplate?.type || 'text',
});
```

### 2. Enviar mídia no payload do disparo
**Arquivo: `src/hooks/useCampaigns.ts`**

- Adicionar `attachmentUrl` e `mediaType` nos parâmetros de `createCampaignMutation` e `dispatchCampaignNow`
- No payload enviado ao `proxy-n8n`, incluir `media_url` e ajustar `type` quando há anexo:

```typescript
payload: {
  company_id: companyId,
  number: contact.phone,
  text: resolvedMessage,
  type: mediaType || "text",          // "image", "document", etc.
  media_url: attachmentUrl || undefined,
  internal_id: `campaign-${campaignId}-${contact.id}`,
  ...
}
```

### 3. Atualizar `campaign_contacts` quando o status da mensagem muda
**Arquivo: `supabase/functions/webhook-n8n-instance/index.ts`**

Na action `upsert_message`, quando o webhook recebe um status update (`delivered`, `read`, `played`), verificar se o `client_message_id` ou `message_id` da mensagem corresponde a um registro de campanha (padrão `campaign-{campaignId}-{contactId}`). Se sim, atualizar o `campaign_contacts` correspondente:

```typescript
// Após atualizar o status da mensagem
if (clientMessageId?.startsWith('campaign-')) {
  const parts = clientMessageId.split('-');
  // campaign-{campaignId}-{contactId}
  const campaignId = parts[1];
  const contactId = parts[2];
  
  await supabase
    .from('campaign_contacts')
    .update({ status: newStatus }) // delivered, read, etc.
    .eq('campaign_id', campaignId)
    .eq('contact_id', contactId);
}
```

Também precisa aplicar na Edge Function `process-scheduled-campaigns` a mesma lógica de mídia para campanhas agendadas.

### Arquivos impactados
| Arquivo | Mudança |
|---|---|
| `src/pages/NewCampaign.tsx` | Passar `attachmentUrl` e `mediaType` do template |
| `src/hooks/useCampaigns.ts` | Incluir `media_url` e `type` correto no payload + aceitar novos params |
| `supabase/functions/webhook-n8n-instance/index.ts` | Propagar status updates para `campaign_contacts` |
| `supabase/functions/process-scheduled-campaigns/index.ts` | Incluir `media_url` e `type` no envio agendado |

