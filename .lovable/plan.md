## Problema

O erro "Erro ao adicionar etiqueta" acontece porque as RLS policies de `tags` e `contact_tags` são **escopadas por `user_id`**, não por `company_id`. Em uma empresa multi-tenant:

- `tags`: só o usuário que criou a etiqueta consegue lê-la / usá-la (`auth.uid() = user_id`).
- `contact_tags` (INSERT): exige que `contacts.user_id = auth.uid()`, ou seja, só funciona se o contato foi criado pelo próprio usuário logado.

No print, Jhonatan (gerente) tenta adicionar uma etiqueta num contato que pertence a outro atendente da mesma empresa → o INSERT é bloqueado pela RLS.

Além disso, o hook `useAddTagToContact` em `src/hooks/useTags.ts` envia `company_id` no insert, mas a policy não valida por empresa, então não adianta.

## Correção (migration)

Reescrever as policies de `tags` e `contact_tags` para serem escopadas por `company_id`, alinhadas com o padrão multi-tenant do projeto (igual `contacts`, `conversations`, etc.):

### `public.tags`
- SELECT/INSERT/UPDATE/DELETE: `company_id = (select company_id from profiles where user_id = auth.uid())`
- Garante backfill: `UPDATE tags SET company_id = (select company_id from profiles where user_id = tags.user_id) WHERE company_id IS NULL`

### `public.contact_tags`
- SELECT/INSERT/DELETE: `company_id = (select company_id from profiles where user_id = auth.uid())`
- Backfill `company_id` via `contacts.company_id` quando estiver nulo.

### Frontend
- `useAddTagToContact` já envia `company_id` corretamente — sem mudanças.
- `useTags` (lista) continua funcionando, mas passará a retornar todas as tags da empresa (comportamento esperado).

## Resultado

Qualquer usuário (admin, gerente, atendente) da mesma empresa consegue criar, listar e atribuir etiquetas em qualquer contato da empresa, respeitando o isolamento multi-tenant.