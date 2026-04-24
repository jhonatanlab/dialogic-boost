

## Plano

### 1) Botão "Disparar Automação" no painel de detalhes do contato (Inbox)

Local: painel direito do Inbox em `src/pages/Inbox.tsx`, dentro da aba "Detalhes", abaixo do `AiSummaryCard` e antes da seção de Etiquetas.

Comportamento:
- Novo bloco com título "Forçar Automação".
- Um `Select` lista as automações ativas da empresa (Follow-Up e qualquer outra com `status = active`).
- Um botão "Disparar agora" chama a Edge Function `execute-automation` com:
  - `automation_id` da automação selecionada,
  - `conversation_id`, `contact_id` e `company_id` da conversa atual.
- A função já valida consistência de empresa, então a execução manual respeita o isolamento multi-tenant (sem risco de cruzar dados).
- Para automações de inatividade, o disparo manual também atualiza `automation_followups` (incremento de `followup_count` e `last_followup_at`) para refletir no card "Follow-Ups por Inatividade" do contato.
- Toast de sucesso/erro e desabilitar o botão durante o envio.

Restrições visuais:
- Aparece apenas quando há conversa selecionada.
- Mostra mensagem "Nenhuma automação ativa" se a lista estiver vazia.
- Apenas para usuários `admin`, `manager` ou atendente atribuído à conversa, para evitar disparos indevidos.

### 2) Logout automático por inatividade (2 horas)

Novo hook: `src/hooks/useAutoLogout.ts`.

Regras:
- Conta tempo desde a última interação do usuário no app.
- Eventos considerados como atividade: `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`, `visibilitychange` (quando volta a ficar visível).
- Após 2 horas sem nenhuma dessas interações:
  - Marca presença como offline (`user_presence.is_online = false`).
  - Faz `supabase.auth.signOut()`.
  - Redireciona para `/auth` com toast: "Sessão encerrada por inatividade (2h sem atividade)".
- Aviso opcional 1 minuto antes via toast: "Você será desconectado em 1 minuto por inatividade".
- O timer reinicia a cada interação real (`debounced` em 1s para não sobrecarregar).
- O hook é montado no `DashboardLayout`, então protege todas as páginas autenticadas.

Integração com presença:
- Mantém compatibilidade com `usePresence`: o auto-logout dispara `goOffline` antes do `signOut` para fechar a sessão de presença corretamente.

### Arquivos envolvidos

- `src/pages/Inbox.tsx` — adicionar bloco "Forçar Automação" no painel de detalhes.
- `src/hooks/useAutoLogout.ts` — novo hook de inatividade (2h).
- `src/components/layout/DashboardLayout.tsx` — montar o `useAutoLogout` junto com `usePresence`.

### Resultado esperado

- O atendente/gerente pode forçar manualmente qualquer automação ativa diretamente no painel do contato no Inbox, respeitando o isolamento por empresa.
- Usuários logados que ficarem 2 horas sem nenhuma interação no app são deslogados automaticamente, com toast informando o motivo, sem afetar quem está usando ativamente.

