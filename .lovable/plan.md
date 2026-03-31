

## Problema

A constraint `conversations_status_check` no banco só permite os status `open`, `closed` e `pending`. O código tenta definir `status = 'in_progress'` ao iniciar atendimento, o que viola a constraint e gera o erro.

Não é um problema de permissão do proprietário — é uma incompatibilidade entre os valores permitidos no banco e os usados no código.

## Solução

### 1. Migração SQL — Atualizar a constraint

Remover a constraint antiga e criar uma nova que inclua `in_progress`:

```sql
ALTER TABLE conversations DROP CONSTRAINT conversations_status_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_status_check
  CHECK (status IN ('open', 'in_progress', 'closed', 'pending'));
```

### 2. Nenhuma mudança no frontend

O código do `Inbox.tsx` já usa `in_progress` corretamente — o problema está exclusivamente no banco.

## Arquivos impactados
- Nova migração SQL (único arquivo)

