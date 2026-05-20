## Causa raiz

O token `22F6050B` ficou como "Aguardando" porque o `checkin_records.company_id` está **NULL**, e a função `process_checkin_token` exige `company_id = p_company_id` para encontrar o registro pendente. Como nunca casa, o webhook loga `no pending record matched for token` e o status nunca vira `completed`.

Por que está NULL? O link "Garçom Gabriel" (`checkin_links`) também tem `company_id = NULL` — em `src/hooks/useCheckinLinks.ts` o `insert` envia apenas `user_id`, `name`, `url_token` e `whatsapp_number`, sem `company_id`. Como `public-checkin` copia `checkin_link.company_id` para o registro, todo check-in gerado por esse link nasce sem empresa.

Confirmação no banco:
- `checkin_records 22F6050B`: status=pending, company_id=NULL, contact_id=NULL
- `checkin_links 8d1d77e0…` ("Garçom Gabriel"): company_id=NULL
- Webhook recebeu o token mas RPC respondeu `no_pending_record`

## Plano

1. **Corrigir a criação de links** (`src/hooks/useCheckinLinks.ts`):
   - Buscar `company_id` do `profiles` do usuário logado antes do insert.
   - Incluir `company_id` no payload do `insert` em `checkin_links`.

2. **Backfill via migração SQL**:
   - `UPDATE checkin_links SET company_id = p.company_id FROM profiles p WHERE checkin_links.user_id = p.user_id AND checkin_links.company_id IS NULL`.
   - `UPDATE checkin_records SET company_id = l.company_id FROM checkin_links l WHERE checkin_records.checkin_link_id = l.id AND checkin_records.company_id IS NULL`.

3. **Recuperar o check-in `22F6050B`** (opcional — confirmar com o usuário):
   - Após o backfill, marcar manualmente o registro pendente como `completed` vinculando ao contato que enviou a mensagem com o token (precisamos do telefone que enviou para localizar `contact_id`). Alternativa: pedir ao cliente para reenviar `22F6050B` no WhatsApp — com `company_id` preenchido, o webhook agora vai casar e completar normalmente.

## Detalhes técnicos

- `process_checkin_token` permanece como está (já filtra por `upper(token)` + `company_id` + `status='pending'`).
- O `public-checkin` já está correto — ele propaga `company_id` do link; o problema é só na origem (link sem empresa).
- Após o backfill, todos os 2 registros pendentes/expirados existentes (`22F6050B`, `CA508127`) ficam com `company_id` correto; `22F6050B` ainda pode ser resgatado por reenvio do token pelo cliente. `CA508127` já expirou.

Quer que eu também marque o `22F6050B` como `completed` manualmente (passo 3), ou prefere pedir ao cliente para reenviar o token após o fix?