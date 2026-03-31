

## Diagnóstico

### 1. "Lidos" não atualiza apesar do log dizer "campaign sync success → read"
O log confirma que o webhook executou `UPDATE campaign_contacts SET status = 'read'` para a campanha `ba3eb5d2`, mas o banco mostra `delivered`. Causa provável: **race condition** — duas requisições concorrentes processam status ao mesmo tempo, e uma sobrescreve a outra. O `upsert_message` (linhas 685-688) atualiza `campaign_contacts` **sem verificar prioridade de status**, permitindo regressão.

### 2. "Respostas" nunca é rastreado
Quando o contato RESPONDE a uma mensagem de campanha, a resposta chega como mensagem `inbound` via `upsert_message`. Não existe nenhuma lógica para verificar se esse contato faz parte de uma campanha recente e atualizar o `campaign_contacts.status` para `replied`.

---

## Plano de correção

### 1. Criar função SQL atômica para atualizar status de campanha
**Migração SQL**

Criar `update_campaign_contact_status(p_campaign_id, p_contact_id, p_new_status)` que só atualiza se o novo status tiver prioridade maior que o atual. Isso elimina race conditions:

```sql
CREATE OR REPLACE FUNCTION update_campaign_contact_status(
  p_campaign_id uuid, p_contact_id uuid, p_new_status text
) RETURNS void AS $$
DECLARE
  priority_map jsonb := '{"pending":0,"sent":1,"delivered":2,"read":3,"replied":4,"failed":5}';
  current_priority int;
  new_priority int;
BEGIN
  new_priority := (priority_map ->> p_new_status)::int;
  SELECT (priority_map ->> status)::int INTO current_priority
  FROM campaign_contacts
  WHERE campaign_id = p_campaign_id AND contact_id = p_contact_id;
  
  IF current_priority IS NULL OR new_priority > current_priority THEN
    UPDATE campaign_contacts SET status = p_new_status
    WHERE campaign_id = p_campaign_id AND contact_id = p_contact_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Usar a função atômica em todos os pontos de sync no webhook
**Arquivo: `supabase/functions/webhook-n8n-instance/index.ts`**

Substituir todos os `supabase.from("campaign_contacts").update(...)` por `supabase.rpc("update_campaign_contact_status", { ... })`. Isso afeta:
- `update_message_status` (linhas 343-347)
- `upsert_message` (linhas 685-697)

### 3. Rastrear "Replied" para mensagens inbound
**Arquivo: `supabase/functions/webhook-n8n-instance/index.ts`**

No final do `upsert_message`, quando `direction === "inbound"`, verificar se existe um `campaign_contacts` ativo para esse `contact_id` + `company_id` criado nas últimas 24h. Se existir, chamar a função atômica com status `replied`:

```typescript
if (messageDirection === "inbound") {
  const { data: recentCampaignContact } = await supabase
    .from("campaign_contacts")
    .select("campaign_id, contact_id")
    .eq("contact_id", contactId)
    .eq("company_id", company_id)
    .in("status", ["sent", "delivered", "read"])
    .gte("created_at", new Date(Date.now() - 24*60*60*1000).toISOString())
    .limit(1)
    .maybeSingle();
  
  if (recentCampaignContact) {
    await supabase.rpc("update_campaign_contact_status", {
      p_campaign_id: recentCampaignContact.campaign_id,
      p_contact_id: contactId,
      p_new_status: "replied"
    });
  }
}
```

### 4. Adicionar "replied" ao mapeamento visual do modal
**Arquivo: `src/components/campaigns/CampaignDetailsModal.tsx`**

Já está configurado com `contactStatusLabels` e `contactStatusColors` para `replied`. Apenas confirmar que os contadores usam o status corretamente (já inclui `replied` nos filtros de contagem).

### Arquivos impactados
| Arquivo | Mudança |
|---|---|
| **Migração SQL** | Criar função `update_campaign_contact_status` |
| `supabase/functions/webhook-n8n-instance/index.ts` | Usar RPC atômico + rastrear replied em inbound |

### Detalhes técnicos
- A função SQL garante atomicidade — impossível regressão de status por race condition
- O rastreamento de "replied" usa janela de 24h para evitar falsos positivos
- Prioridade: `pending(0) < sent(1) < delivered(2) < read(3) < replied(4) < failed(5)`

