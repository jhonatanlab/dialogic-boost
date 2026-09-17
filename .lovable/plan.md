# Corrigir "erro ao criar usuário"

## Situação

Ao clicar em "Criar Usuário" a tela mostra apenas a mensagem genérica "Edge Function returned a non-2xx status code". Verifiquei os registros da rotina de criação e não há nenhuma linha de erro gravada, e nenhum usuário novo foi criado no banco. Ou seja: a falha existe, mas hoje o motivo real fica escondido — nem o app nem os registros mostram qual é.

Por isso o primeiro passo é revelar o motivo, e em seguida tratar as causas prováveis com mensagens claras.

## O que será feito

1. Mostrar o motivo real na tela
   - A tela de Usuários passa a ler a mensagem devolvida pela rotina de criação (em vez da mensagem genérica) em todas as ações: criar, alterar cargo, bloquear e desbloquear.

2. Registrar o motivo no servidor
   - A rotina de criação passa a gravar o erro com contexto (ação, e-mail, empresa) para permitir diagnóstico imediato caso volte a falhar.

3. Tratar as causas mais prováveis com mensagens em português
   - E-mail já cadastrado no sistema: "Este e-mail já possui conta. Use outro e-mail."
   - Senha rejeitada (curta ou vazada): explicar que a senha precisa ser mais forte.
   - Usuário já pertence a esta empresa: aviso específico.
   - Qualquer outra falha: devolver a mensagem original em vez de erro genérico.

4. Republicar a rotina e testar
   - Após publicar, tentar criar um usuário de teste e confirmar na lista. Se ainda falhar, o motivo real aparecerá na tela e nos registros, e eu corrijo a causa apontada.

## Detalhes técnicos

- `src/pages/Users.tsx`: `callManageUsers` passa a extrair o corpo do erro (`error.context?.json()?.error`) com fallback para `error.message`, igual ao padrão já usado em `AgentAI.tsx`.
- `supabase/functions/manage-users/index.ts`:
  - no ramo `create_user`, tratar `createUserError` mapeando `already been registered` → 409 com mensagem amigável, `password`/`weak` → 400, demais → 500 com a mensagem original;
  - `console.error` com ação e e-mail nos pontos de falha (criação do usuário, inserção em `profiles`, inserção em `user_roles`);
  - manter as permissões atuais (admin e manager) e o escopo por `company_id` do solicitante.
- Redeploy apenas de `manage-users`.
- Nenhuma mudança de schema ou de políticas de acesso.
