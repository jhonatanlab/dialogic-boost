
Objetivo: corrigir de forma definitiva a atualização de status no modal de campanhas (Entregue/Lido) para mensagens enviadas por campanha.

1) Diagnóstico confirmado no backend
- O chat mostra status corretos porque a tabela de mensagens está sendo atualizada.
- A tabela `campaign_contacts` permanece em `sent`, então o modal nunca sobe para `delivered/read`.
- Logs atuais mostram `update_message_status` executando, mas sem log de sincronização de `campaign_contacts`.
- Causa principal: o webhook de status não consegue sempre reconstruir o vínculo da mensagem com a campanha (faltando `internal_id`/`campaign_id` no evento de status).

2) Corrigir vínculo campanha ↔ mensagem no envio (fonte da verdade)
Arquivos:
- `src/hooks/useCampaigns.ts`
- `supabase/functions/process-scheduled-campaigns/index.ts`

Plano:
- Antes de chamar o envio externo, criar registro outbound na tabela de mensagens com:
  - `client_message_id = campaign|{campaignId}|{contactId}`
  - `status = sending`
  - `message_type`, `content`, `metadata` (incluindo mídia e `campaign_id`)
- Em falha de envio, marcar esse registro como `failed`.
- Isso replica a estratégia já usada no Inbox (pré-registro + reconciliação), garantindo rastreabilidade da campanha mesmo se o provedor não devolver `internal_id` no callback de status.

3) Fortalecer a reconciliação no webhook de status
Arquivo:
- `supabase/functions/webhook-n8n-instance/index.ts`

Plano:
- No `update_message_status`, após localizar a mensagem por `message_id`, tentar resolver campanha nesta ordem:
  1. `client_message_id` no padrão `campaign|...`
  2. campos de metadata (`campaign_id`) quando existirem
  3. fallback controlado: último `campaign_contacts` do mesmo `contact_id` + `company_id` dentro de janela curta (ex.: 2h), apenas se ainda não houver vínculo
- Atualizar `campaign_contacts.status` só se o novo status tiver prioridade maior (evitar regressão de estado).
- Adicionar logs explícitos: “campaign sync success”, “campaign sync fallback”, “campaign sync skipped”.

4) Corrigir inconsistência de metadata no upsert_message
Arquivo:
- `supabase/functions/webhook-n8n-instance/index.ts`

Plano:
- Remover/ajustar gravação indevida de `campaign_contact_id` com valor de `contact_id`.
- Só gravar metadados de campanha quando houver evidência real de campanha (`campaign_id` ou `internal_id` com prefixo `campaign|`).

5) Atualização visual do modal sem depender de reabrir
Arquivo:
- `src/components/campaigns/CampaignDetailsModal.tsx`

Plano:
- Adicionar assinatura realtime (ou refetch periódico enquanto aberto) em `campaign_contacts` da campanha ativa.
- Recalcular cards com os novos estados assim que chegar update.
- Manter mapeamento de status compatível com normalização atual (`received→delivered`, `played→read`, `server_ack→sent`).

6) Validação fim-a-fim
- Criar campanha imediata para 1 contato.
- Confirmar sequência:
  - `campaign_contacts`: `pending/sent -> delivered -> read`
  - modal: contadores de Enviados/Entregues/Lidos sobem automaticamente
  - chat continua consistente.
- Repetir com campanha agendada para validar o fluxo do processador agendado.

Detalhes técnicos
- Sem migração obrigatória de banco para essa correção.
- O foco é tornar o vínculo determinístico via `client_message_id` de campanha e reconciliação robusta no webhook.
- Com isso, mesmo que o callback de status venha “pobre” (só `message_id`), ainda conseguimos atualizar corretamente o `campaign_contacts`.
