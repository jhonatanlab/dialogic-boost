# Limpeza completa ao deletar contato

## Problema

Ao deletar o contato `5583988907220`, o registro correspondente em `ai_control` (telefone `558388907220`, status `paused`) permaneceu na empresa `8559e919-...`. Isso acontece porque:

1. `useDeleteContact` (`src/hooks/useContacts.ts`) executa apenas `DELETE FROM contacts WHERE id = ?`. Não há `ON DELETE CASCADE` nem trigger.
2. `ai_control` **tem** `company_id` (text) e `telefone` (text), mas **não** tem `contact_id`. A ligação é feita pelo telefone normalizado (sem caracteres não-numéricos; o nono dígito brasileiro é removido — ex.: `5583988907220` → `558388907220`).
3. Diversas tabelas filhas (conversations, messages, contact_tags, contact_notes, fidelity_cards, automation_followups, etc.) também ficam órfãs — algumas podem dar erro de RLS/integridade ao serem listadas depois.

## Solução

Centralizar a limpeza em uma **função SQL `SECURITY DEFINER`** chamada `delete_contact_cascade(p_contact_id uuid)`, invocada pelo hook `useDeleteContact` via `supabase.rpc(...)`. Isso garante atomicidade e respeita o `company_id` do contato (não toca em registros de outras empresas).

### A função fará, na ordem:

1. Buscar o contato (`id`, `phone`, `company_id`). Se não existir → retorna.
2. Calcular `phone_normalized = regexp_replace(phone, '\D', '', 'g')` e a variante "sem nono dígito" (BR: para números com 13 chars começando em `55`, remove o `9` da posição 5) — para casar com o formato salvo em `ai_control`.
3. Deletar em cascata, todos restritos a `company_id` do contato:
   - `messages WHERE contact_id = ?`
   - `conversation_events WHERE conversation_id IN (...)` 
   - `automation_executions / automation_followups WHERE contact_id = ?`
   - `campaign_contacts WHERE contact_id = ?`
   - `checkin_records WHERE contact_id = ?`
   - `fidelity_cards WHERE contact_id = ?`
   - `contact_ai_summaries WHERE contact_id = ?`
   - `contact_custom_fields WHERE contact_id = ?`
   - `contact_notes WHERE contact_id = ?`
   - `contact_tags WHERE contact_id = ?`
   - `activity_logs WHERE contact_id = ?`
   - `conversations WHERE contact_id = ?`
   - `ai_control WHERE company_id = ?::text AND telefone IN (phone_normalized, phone_sem_nono)`
   - `contacts WHERE id = ?`

### Permissão

`GRANT EXECUTE ON FUNCTION public.delete_contact_cascade(uuid) TO authenticated;` — a função valida internamente que `company_id` do contato == `get_user_company_id()` antes de prosseguir, prevenindo abuso cross-tenant.

### Limpeza retroativa (one-shot)

Após criar a função, rodar uma limpeza dos `ai_control` órfãos atuais para a empresa `8559e919-...` (e demais empresas): deletar registros cujo telefone normalizado não bate com nenhum contato existente da mesma empresa. Será feito via insert tool (DELETE).

## Arquivos alterados

- **Migração SQL** (nova): cria `delete_contact_cascade(uuid)` e índices auxiliares se necessários.
- **DELETE retroativo** (insert tool): remove os `ai_control` órfãos do contato `5583988907220` e de outros contatos já apagados.
- `src/hooks/useContacts.ts`: substituir o `.from("contacts").delete()` por `supabase.rpc("delete_contact_cascade", { p_contact_id: id })`.

## Observações

- Não vou adicionar trigger `BEFORE DELETE ON contacts` porque o RLS de `contacts` permite delete pelo dono — manter a lógica explícita via RPC é mais previsível e fácil de auditar.
- A normalização "sem nono dígito" cobre o caso brasileiro observado nos dados; se houver outros formatos, expandimos depois.
