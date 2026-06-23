## Bloquear Usuários (em vez de remover)

Vamos trocar o "Remover" por "Bloquear/Desbloquear", preservando todos os dados (conversas, tags, mensagens, etc.). O usuário bloqueado não consegue mais acessar o sistema, mas continua existindo no banco.

### 1. Banco de dados
- Adicionar coluna `is_blocked boolean default false` e `blocked_at timestamptz` na tabela `profiles`.
- Criar função `is_user_blocked(uuid)` (security definer) para uso futuro em policies, se necessário.

### 2. Edge function `manage-users`
- Substituir a action `remove` por duas novas:
  - `block`: marca `is_blocked = true`, define `blocked_at = now()` e revoga a sessão do usuário via `auth.admin.signOut(user_id, 'global')`. Bloquear também a conta no Auth via `auth.admin.updateUserById(user_id, { ban_duration: '876000h' })` (≈100 anos) para impedir novo login.
  - `unblock`: `is_blocked = false`, `blocked_at = null`, e `ban_duration: 'none'` no Auth.
- Manter `list` retornando `is_blocked` e `blocked_at`.
- Não permitir bloquear a si mesmo nem outro `admin`.

### 3. Frontend `src/pages/Users.tsx`
- Adicionar `is_blocked` e `blocked_at` em `CompanyUser`.
- Trocar o ícone Trash2 por um toggle:
  - Usuário ativo → botão "Bloquear" (ícone `Ban`, vermelho) com AlertDialog confirmando.
  - Usuário bloqueado → botão "Desbloquear" (ícone `CheckCircle`, verde).
- Mostrar badge "Bloqueado" ao lado do papel quando `is_blocked = true`.
- Desabilitar o Select de papel quando bloqueado.
- Mutations `blockMutation` / `unblockMutation` invalidando `company-users`.

### 4. Bloqueio no login
- No `src/pages/Auth.tsx`, após login bem-sucedido, verificar `profiles.is_blocked` do usuário. Se true: `supabase.auth.signOut()` e exibir toast "Sua conta foi bloqueada. Contate o administrador.".

### Fora do escopo
- Não remover dados, não alterar RLS de outras tabelas, sem mudanças em conversas/tags.