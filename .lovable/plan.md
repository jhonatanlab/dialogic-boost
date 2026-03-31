
Objetivo: fazer o modal de campanha refletir exatamente os mesmos eventos que já aparecem no chat (Entregue/Lido/Respondeu), sem perder atualização.

Diagnóstico confirmado
- O problema principal está no banco, não no modal: a constraint atual de `campaign_contacts.status` aceita só `pending/sent/failed/delivered`.
- O webhook está tentando gravar `read` e `replied`, mas falha (já aparece nos logs: `campaign_contacts_status_check`), então o chat atualiza (tabela `messages`) e o modal não (tabela `campaign_contacts`).

Plano de implementação

1) Corrigir a constraint de status da tabela `campaign_contacts` (migração)
- Criar migração para:
  - remover `campaign_contacts_status_check` atual;
  - recriar permitindo: `pending`, `sent`, `delivered`, `read`, `replied`, `failed`.
- Isso destrava imediatamente gravações de “Lido” e “Respondeu” que hoje estão sendo bloqueadas.

2) Backfill dos registros já afetados (na mesma migração)
- Reconciliar `campaign_contacts` com base nas mensagens já salvas:
  - outbound de campanha (`client_message_id` no padrão `campaign|{campaignId}|{contactId}`) para subir até `read` quando aplicável;
  - inbound dentro da janela de 24h para subir para `replied` quando aplicável.
- Aplicar por prioridade (nunca regredir status).

3) Ajuste de robustez no webhook `webhook-n8n-instance`
- Manter uso da RPC `update_campaign_contact_status` como caminho principal.
- Melhorar logs de sync para diferenciar claramente:
  - sucesso,
  - ignorado por prioridade,
  - campanha não resolvida.
- Garantir que o tracking de resposta continue somente para campanhas elegíveis (sem falsos positivos).

4) Garantia visual no modal
- Manter `campaign_contacts` como fonte do modal (já está correto em conceito).
- Adicionar refetch de segurança enquanto o modal estiver aberto (ex.: intervalo curto) para cobrir eventual perda de evento realtime, mantendo os cards consistentes com o backend.

Arquivos impactados
- `supabase/migrations/<nova_migracao>.sql`
  - ajuste da constraint + backfill de status
- `supabase/functions/webhook-n8n-instance/index.ts`
  - robustez de reconciliação/logs
- `src/components/campaigns/CampaignDetailsModal.tsx`
  - refetch de segurança com modal aberto

Validação (fim a fim)
1. Disparar campanha para 1 contato.
2. Confirmar sequência no banco: `sent -> delivered -> read -> replied`.
3. Confirmar no modal, sem fechar/reabrir:
   - Entregues sobe quando entregar,
   - Lidos sobe quando ler,
   - Respostas sobe ao responder.
4. Confirmar nos logs que não existe mais erro de `campaign_contacts_status_check`.

Detalhe técnico importante
- A função atômica `update_campaign_contact_status` já está correta para prioridade; o bloqueio real é a constraint antiga da tabela.
- Sem corrigir essa constraint, qualquer tentativa de gravar `read/replied` continuará falhando, mesmo com webhook e modal corretos.
