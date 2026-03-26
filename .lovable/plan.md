

## Diagnóstico

O status desaparece porque o `upsert_message` **sobrescreve** o status que já foi atualizado pelo `update_message_status`.

**Sequência real:**
1. Mensagem enviada → status `sending` no banco
2. `update_message_status` chega → atualiza para `sent` → depois `delivered` → depois `read` ✓
3. `upsert_message` chega (reconciliação) → sobrescreve o status com `"sent"` ou o default `"received"` (linha 321) ✗

O status volta para um valor inferior porque o `upsert_message` não respeita a hierarquia de status.

## Solução

Adicionar uma lógica de **hierarquia de status** na Edge Function `webhook-n8n-instance`:

### Alteração no `upsert_message`

1. **Criar um mapa de prioridade de status:**
   ```
   sending(0) < sent/server_ack(1) < delivered/received(2) < read(3) < failed(4)
   ```

2. **No caminho de reconciliação (internal_id encontrado):** antes de fazer o UPDATE, buscar o status atual da linha. Se o status atual for mais avançado que o novo, **preservar o status atual**.

3. **No caminho de upsert normal (sem internal_id):** ao fazer o upsert, se a linha já existir (conflito), verificar se o status existente é mais avançado e preservá-lo.

### Detalhes técnicos

- **Arquivo:** `supabase/functions/webhook-n8n-instance/index.ts`
- Na reconciliação com `internal_id` (linha 336-358): fazer `select("id, status")` e comparar prioridades antes de incluir `status` no payload de update
- No upsert normal (linha 386-408): buscar primeiro se existe pelo `message_id`, e se existir com status superior, não sobrescrever
- Adicionar função helper `statusPriority(status: string): number`

Nenhuma mudança no frontend ou no banco de dados é necessária.

