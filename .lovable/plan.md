

## Plano: Limpar dados e adicionar filtro de cutoff no webhook

### O que será feito

1. **Limpar dados novamente** — DELETE em messages, conversation_events, conversations, contact_tags, contact_notes, contact_custom_fields, fidelity_cards, checkin_records, campaign_contacts, contacts.

2. **Registrar timestamp de cutoff** — Inserir na tabela `admin_settings` uma chave `data_cutoff_timestamp` com o valor do momento da limpeza (ISO string). Isso será usado pela empresa `6e6a75bf-1766-4748-bbcd-f6c37823557f`.

3. **Adicionar filtro no webhook** — No `upsert_message` do `webhook-n8n-instance/index.ts`, logo após validar os campos obrigatórios, consultar `admin_settings` para buscar `data_cutoff_timestamp` da empresa. Se `sent_at` existir e for anterior ao cutoff, ignorar a mensagem retornando `{ action: "ignored_old_message" }`. Para mensagens sem `sent_at`, não filtrar (são mensagens em tempo real).

### Detalhes técnicos

**Arquivo**: `supabase/functions/webhook-n8n-instance/index.ts`

Inserir bloco no início da action `upsert_message` (após linha ~546):
```typescript
// Check cutoff timestamp
const { data: cutoffSetting } = await supabase
  .from("admin_settings")
  .select("setting_value")
  .eq("setting_key", "data_cutoff_timestamp")
  .eq("company_id", company_id)
  .maybeSingle();

if (cutoffSetting?.setting_value && sent_at) {
  const cutoff = new Date(cutoffSetting.setting_value).getTime();
  const msgTime = new Date(sent_at).getTime();
  if (msgTime < cutoff) {
    console.log("[upsert_message] ignored old message, sent_at:", sent_at, "< cutoff:", cutoffSetting.setting_value);
    return json({ success: true, action: "ignored_old_message" });
  }
}
```

**Também aplicar o mesmo filtro na action `update_message_status`** — quando o webhook tenta criar placeholder para status de mensagens antigas.

**Database**: Inserir via insert tool:
```sql
DELETE FROM messages;
DELETE FROM conversation_events;
DELETE FROM conversations;
DELETE FROM contact_tags;
DELETE FROM contact_notes;
DELETE FROM contact_custom_fields;
DELETE FROM fidelity_cards;
DELETE FROM checkin_records;
DELETE FROM campaign_contacts;
DELETE FROM contacts;
```

E inserir o cutoff timestamp via insert tool com o user_id do perfil da empresa.

