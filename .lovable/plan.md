

## Plano: Exclusividade Mútua entre Integrações WhatsApp

### Problema
O sistema tem 4 formas de integração WhatsApp (Meta, Z-API, API Nativa, API Automação) que podem ficar ativas simultaneamente. Isso causa conflitos no envio/recebimento de mensagens, pois o `send-message` não sabe qual provedor usar.

### Solução
Implementar exclusividade mútua: ao ativar uma integração, as demais são automaticamente desativadas.

### Alterações

**1. `src/hooks/useWhatsappIntegrations.ts` — Desativar concorrentes ao salvar**
- No `saveIntegration.mutationFn`, após salvar com sucesso a integração (Meta ou Z-API), desativar a API Nativa (deletar/desconectar `whatsapp_instances` da empresa) e desativar a API Automação (setar `n8n_automation_enabled` para `"false"` em `admin_settings`).

**2. `src/pages/WhatsappIntegrations.tsx` — Desativar concorrentes nos toggles**
- Quando o toggle da **API Nativa** for ativado: setar o status da integração em `whatsapp_integrations` para `'disconnected'` e desativar `n8n_automation_enabled`.
- Quando o toggle da **API Automação** for ativado: setar o status da integração em `whatsapp_integrations` para `'disconnected'` e desativar a API Nativa (toggle off).
- Invalidar as queries relevantes (`whatsapp-integrations`, `my-whatsapp-instance`, `admin-settings`) após cada mudança para atualizar os badges na UI.

**3. `supabase/functions/send-message/index.ts` — Lógica de fallback**
- Ajustar a query para buscar apenas integrações com `status = 'connected'`.
- Se não encontrar em `whatsapp_integrations`, verificar se a empresa tem API Automação ativa (consultar `admin_settings` para `n8n_automation_enabled` e `n8n_automation_outbound`) e enviar por lá.
- Manter `.maybeSingle()` em vez de `.single()` para evitar erro quando não há integração.

**4. UI — Feedback visual**
- Quando uma integração for ativada e as outras desativadas, mostrar um toast informando: "As demais integrações foram desativadas automaticamente."
- Os badges nas abas já são reativos às queries, então refletirão a mudança automaticamente após invalidação.

### Detalhes técnicos
- A desativação de Meta/Z-API será feita via `UPDATE whatsapp_integrations SET status = 'disconnected'` usando o service role no edge function ou diretamente pelo client (RLS permite update por `user_id = auth.uid()`).
- A desativação da API Nativa será apenas UI (setar `nativeEnabled = false`), já que ela depende do estado da instância no banco.
- A desativação da API Automação será um update em `admin_settings` setando `n8n_automation_enabled = 'false'`.
- Todas as invalidações de cache serão feitas com `queryClient.invalidateQueries()`.

