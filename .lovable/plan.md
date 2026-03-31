
Objetivo: corrigir o fluxo de “Disparo Imediato” para realmente enviar a mensagem aos contatos selecionados, e não apenas criar registros com status `sending`.

1) Diagnóstico confirmado
- O fluxo atual de `src/hooks/useCampaigns.ts` apenas:
  - cria `campaigns`
  - cria `campaign_contacts` com `status: pending`
- Não existe rotina de envio para campanhas (nem no frontend, nem em função backend dedicada de campanha).
- Resultado real no banco: campanha `sending` + contatos `pending` (sem disparo).
- Em `src/pages/NewCampaign.tsx`, o sucesso/redirect acontece imediatamente após chamar `createCampaign`, sem aguardar conclusão real do processo.
- `campaigns.company_id` está ficando `null`, o que prejudica consistência multi-tenant.

2) Implementação proposta (sem mudar arquitetura principal)
- Arquivo: `src/hooks/useCampaigns.ts`
  - Adicionar contexto do usuário (buscar `company_id` no `profiles`) dentro da criação.
  - Salvar `company_id` em `campaigns` e `campaign_contacts`.
  - Criar rotina interna `dispatchCampaignNow(...)` para campanhas sem agendamento:
    - Buscar contatos por `contactIds` e validar telefone.
    - Buscar endpoint `n8n_send_message` em `admin_settings`.
    - Enviar 1 a 1 via `supabase.functions.invoke("proxy-n8n")`.
    - Atualizar cada `campaign_contacts` para:
      - `sent` + `sent_at` em sucesso
      - `failed` + `error_message` em falha
    - Ao final:
      - atualizar campanha para `sent` + `sent_at` (mantendo estatística de falhas em `campaign_contacts`)
      - se nenhum envio for possível, manter `sending` e registrar erro descritivo (evitar falso sucesso silencioso).

3) Correção de UX/fluxo de submissão
- Arquivo: `src/pages/NewCampaign.tsx`
  - Trocar uso de `mutate` por `mutateAsync` (ou expor `createCampaignAsync` no hook).
  - Aguardar conclusão antes de mostrar toast de sucesso e redirecionar.
  - Em erro, mostrar toast destrutivo e não redirecionar.
  - Desabilitar botão “Ativar Campanha” durante processamento para evitar clique duplicado.

4) Compatibilidade com campanhas agendadas
- Manter comportamento:
  - `scheduledAt` definido => status `scheduled`, sem disparo imediato.
  - sem `scheduledAt` => dispara imediatamente.
- (Fora deste ajuste) o executor automático de agendadas pode ser implementado depois como rotina backend periódica.

5) Validação funcional (E2E)
- Cenário A (imediato):
  - Criar campanha com 2+ contatos.
  - Confirmar chamadas ao `proxy-n8n`.
  - Confirmar `campaign_contacts` saindo de `pending` para `sent/failed`.
  - Confirmar campanha finalizada (`sent`) com `sent_at`.
- Cenário B (agendada):
  - Criar com data/hora.
  - Confirmar status `scheduled` e ausência de envio imediato.
- Cenário C (falha de endpoint):
  - Forçar erro no endpoint e validar mensagens de erro + marcação `failed` por contato.

Detalhes técnicos
- Não exige migração de banco para esta correção.
- Reutiliza integração existente com n8n via `proxy-n8n` (com autenticação e allowlist já implementadas).
- Corrige consistência multi-tenant preenchendo `company_id` na criação de campanha/itens.
- Evita falso positivo de sucesso no frontend ao sincronizar toasts/navegação com o resultado real do envio.
