## Problema

Hoje a policy `SELECT` da tabela `conversations` só filtra por `company_id`, então qualquer usuário da empresa (inclusive um atendente que não faz parte da equipe) enxerga todas as conversas — inclusive as atribuídas a uma equipe da qual ele não participa.

## Objetivo

Restringir a visibilidade das conversas por equipe:

- **Admin** e **manager**: continuam vendo todas as conversas da empresa.
- **Atendente (agent)**: vê apenas conversas que atendem a pelo menos uma das condições:
  1. `assigned_team IS NULL` (conversa sem equipe), OU
  2. `assigned_team` pertence a uma equipe em que ele é membro (`team_members.member_user_id = auth.uid()`), OU
  3. `assigned_to = auth.uid()` (atribuída diretamente a ele).

Nada mais muda: envio/atualização de mensagens, filtros do inbox e outros papéis permanecem intactos.

## Implementação

Uma única migração no banco:

1. **Função `security definer`** `public.user_can_view_conversation(_conversation_id uuid)` que retorna `boolean` conforme a regra acima. Marcada como `stable`, `security definer`, `set search_path = public`. Usa `has_role(auth.uid(),'admin')` e `has_role(auth.uid(),'manager')` para o bypass; caso contrário verifica `assigned_team IS NULL`, `assigned_to = auth.uid()` ou existência em `team_members`.

2. **Nova policy RESTRICTIVE** `SELECT` em `public.conversations`:
   ```
   AS RESTRICTIVE FOR SELECT TO authenticated
   USING (public.user_can_view_conversation(id))
   ```
   A policy PERMISSIVE existente (`company_id = get_user_company_id()`) permanece, garantindo o isolamento multi-tenant; a nova RESTRICTIVE aplica o AND por equipe.

3. Aplicar a mesma regra também nas policies **UPDATE** e **DELETE** (RESTRICTIVE), para o atendente não conseguir atribuir/fechar uma conversa que ele nem enxerga. INSERT permanece igual (criação vem de webhooks/edge functions com service role).

## Sem mudanças de frontend

O dropdown "Todas as equipes / Engenharia / …" e os hooks (`useConversations`, `useMessages`, etc.) continuam iguais — como o RLS passa a filtrar no banco, o atendente simplesmente deixa de receber as conversas de equipes das quais não faz parte.

## Verificação

Após a migração, logar como o Kaique (atendente, fora da equipe Gestão) e confirmar que a conversa do Jhonatan José (atribuída à Gestão) desaparece da fila; logar como admin/manager e confirmar que ela continua visível.
