

## Diagnóstico

### 1. Status regredindo (read → sent)
A causa está na ação `update_message_status` (linhas 246-248 da Edge Function). Ela faz um **UPDATE cego** sem verificar a hierarquia de status:

```typescript
.update({ status: mappedStatus })  // sobrescreve QUALQUER status anterior
```

Quando o WhatsApp envia eventos atrasados (ex: um ACK `sent` chegando DEPOIS do `read`), o status é rebaixado. A proteção de hierarquia foi adicionada apenas ao `upsert_message`, mas **nunca ao `update_message_status`**.

### 2. Registro `app-xxx` sobrando
Os dados confirmam que a reconciliação falhou — existem DUAS linhas para a mesma mensagem:
- `app-5ca2eb9f...` → status `sending`, sem metadata
- `3EB01147...` → status `sent`, com metadata

O n8n provavelmente não enviou o `internal_id` ou a busca não o encontrou, então criou uma linha nova em vez de atualizar a existente.

---

## Solução

### Alteração 1: Hierarquia de status no `update_message_status`
**Arquivo:** `supabase/functions/webhook-n8n-instance/index.ts`

Antes de fazer o UPDATE, buscar o status atual e só atualizar se o novo status for superior na hierarquia:

```typescript
// 1. Buscar status atual
const { data: current } = await supabase
  .from("messages")
  .select("id, status")
  .eq("message_id", message_id)
  .maybeSingle();

if (!current) { /* vai para o fluxo de placeholder/defer */ }

// 2. Só atualizar se novo status é superior
if (statusPriority(mappedStatus) <= statusPriority(current.status)) {
  return json({ success: true, action: "status_kept", id: current.id, 
    kept: current.status, ignored: mappedStatus });
}

// 3. Atualizar
await supabase.from("messages").update({ status: mappedStatus }).eq("id", current.id);
```

### Alteração 2: Limpeza de registros `app-xxx` órfãos
**Migração SQL:** Apagar linhas `app-xxx` que têm uma correspondente `3EB...` com mesmo conteúdo, direção e janela de 60 segundos.

```sql
DELETE FROM messages WHERE id IN (
  SELECT a.id FROM messages a
  JOIN messages b ON a.conversation_id = b.conversation_id
    AND a.direction = b.direction AND a.content = b.content
  WHERE a.message_id LIKE 'app-%'
    AND b.message_id NOT LIKE 'app-%'
    AND ABS(EXTRACT(EPOCH FROM (a.created_at - b.created_at))) < 60
);
```

### Alteração 3: Deduplicação no frontend mais robusta
**Arquivo:** `src/pages/Inbox.tsx` (linhas 359-369)

Remover a restrição `msg.status !== "sending"` no filtro de deduplicação — qualquer `app-xxx` que tenha uma correspondente real deve ser escondido, independente do status:

```typescript
// Antes: if (!msg.message_id?.startsWith("app-") || msg.status !== "sending") continue;
// Depois: if (!msg.message_id?.startsWith("app-")) continue;
```

---

## Resumo de arquivos alterados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/webhook-n8n-instance/index.ts` | Adicionar checagem de hierarquia no `update_message_status` |
| `src/pages/Inbox.tsx` | Relaxar filtro de deduplicação app-xxx |
| Nova migração SQL | Limpar registros app-xxx órfãos existentes |

