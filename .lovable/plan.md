

## Plano: Página Admin — Gerenciamento de Empresas

### Objetivo
Criar uma página `/admin/companies` para gerenciar todas as empresas do EloChat, com visão geral, contagem de usuários, e capacidade de bloquear/reativar empresas. Acesso restrito ao role `admin`.

### Alterações no banco de dados

**Migration 1 — Adicionar coluna `is_active` na tabela `companies`**
```sql
ALTER TABLE public.companies ADD COLUMN is_active boolean NOT NULL DEFAULT true;
```
- Empresas bloqueadas terão `is_active = false`
- Todas as empresas existentes ficam ativas por padrão

**Migration 2 — Policy para admin atualizar `is_active`**
- A policy `Admins can update all companies` já existe, então o admin já pode fazer UPDATE. Nenhuma policy adicional é necessária.

### Nova página: `src/pages/AdminCompanies.tsx`

Seguindo o padrão visual do `AdminWhatsapp.tsx`:

- **Header** com ícone e título "Admin SaaS — Empresas"
- **Cards de resumo**: Total de empresas, Empresas ativas, Empresas bloqueadas, Total de usuários
- **Tabela de empresas** com colunas:
  - Nome da empresa
  - CNPJ
  - Plano
  - Usuários (count de profiles)
  - Status (badge ativo/bloqueado)
  - Data de criação
  - Ações (botão bloquear/reativar)
- **Busca** por nome da empresa
- Botões de ação com confirmação via toast

A query buscará `companies` + count de `profiles` agrupado por `company_id`.

### Rota e navegação

**`src/App.tsx`**
- Adicionar rota `/admin/companies` apontando para `AdminCompanies`

**`src/components/layout/AppSidebar.tsx`**
- Não adicionar ao menu principal (é uma rota admin, acessada manualmente como `/admin/whatsapp`)

### Proteção de acesso
- Na página, verificar se o usuário tem role `admin` via `has_role`
- Se não for admin, redirecionar para `/dashboard`

### Arquivos criados/modificados
- `supabase/migrations/xxx.sql` — adicionar `is_active` à tabela `companies`
- `src/pages/AdminCompanies.tsx` — nova página
- `src/App.tsx` — nova rota

