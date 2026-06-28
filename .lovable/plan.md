# Toggle de IA no painel lateral da conversa

Adicionar um controle (Switch) no painel lateral direito do Inbox que permite ativar/desativar a IA para o contato da conversa atual, gravando em `ai_control` (chave: `telefone` + `company_id`).

## Comportamento

- **Localização**: painel lateral direito da conversa (`src/pages/Inbox.tsx`), em um card próprio chamado **"Atendimento por IA"**, posicionado logo abaixo do card de Resumo IA.
- **Visual**: ícone de robô + label "IA ativa para este contato" + Switch à direita + texto auxiliar mostrando o status atual (Ativa / Pausada) e quando foi alterado pela última vez.
- **Regra de estado**:
  - `status = 'active'` (ou registro inexistente) → Switch ligado.
  - `status = 'paused'` → Switch desligado.
- **Ação ao alternar**:
  - Ligar → `UPSERT` em `ai_control` com `status = 'active'`, `updated_at = now()`.
  - Desligar → `UPSERT` com `status = 'paused'`.
  - Chave do upsert: `(telefone, company_id)`.
  - `telefone` = `contact.phone` normalizado (apenas dígitos, sem `+`), igual ao padrão já usado pelo webhook.
- **Pré-requisito**: se o contato não tiver telefone, o card mostra mensagem "Contato sem telefone — IA não pode ser controlada" e o Switch fica desabilitado.
- **Feedback**: toast de sucesso/erro e atualização otimista (React Query).
- **Permissão**: visível para todos os perfis que já têm acesso ao Inbox (admin, manager, agent). Sem mudança de RLS — `ai_control` já tem políticas por `company_id`.

## Eventos de auditoria

Registrar um `conversation_event` (tipo `ai_toggled`) na conversa atual a cada alteração, com metadata `{ previous_status, new_status, by_user_id }`, para aparecer na aba **Histórico** e no chat, mantendo o padrão dos outros eventos do sistema.

## Detalhes técnicos

- **Novo hook** `src/hooks/useAiControl.ts`:
  - `useAiControlStatus(phone, companyId)` → query em `ai_control` por `telefone` + `company_id` (maybeSingle); retorna `'active' | 'paused'` (default `active`).
  - `useToggleAiControl()` → mutation que faz `upsert` em `ai_control` e insert em `conversation_events`, invalida `['ai-control', phone]`.
- **Novo componente** `src/components/inbox/AiControlCard.tsx`:
  - Props: `conversationId`, `contactPhone`, `contactName`.
  - Usa Card + Switch (shadcn) seguindo tokens do design system (Ciano `#00D4D4` para estado ativo).
- **Integração em `src/pages/Inbox.tsx`**:
  - Importar e renderizar `<AiControlCard />` no painel lateral, dentro da aba "Detalhes" (mesma coluna do `AiSummaryCard`).
- **Sem mudança de schema**: `ai_control` já existe com `(telefone, company_id, status, updated_at)`.
- **Normalização de telefone**: usar helper já existente no projeto se houver, caso contrário aplicar `phone.replace(/\D/g, '')` localmente no hook.

## Fora do escopo

- Não altera o fluxo da automação/n8n — ele continua lendo `ai_control` como hoje.
- Não cria página de gestão global de IA por contato.
- Não modifica RLS nem grants existentes.
