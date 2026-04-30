## Por que o check-in fica "Aguardando"

Hoje a edge function `public-checkin` cria o registro com `status=pending` e gera um token (ex: `61B99860`). O cliente é redirecionado para o WhatsApp com a mensagem `...Token: 61B99860`. Mas **nenhum webhook de entrada** (`webhook-n8n-instance`, `webhook-meta`, `webhook-zapi`) procura por esse token nas mensagens recebidas — então o registro nunca é vinculado ao contato e nunca completa a fidelidade.

## O que vou implementar

### 1. Detecção automática do token nos webhooks de entrada

Em cada um dos 3 webhooks de mensagem entrante, ao processar uma mensagem `inbound` de texto:

- Aplicar regex `/Token:\s*([A-Z0-9]{8})/i` no conteúdo
- Se casar e existir um `checkin_record` com aquele token, `status='pending'`, e mesmo `company_id`:
  - Criar/encontrar o contato pelo telefone (já existe `findOrCreateContact`)
  - Atualizar `checkin_records`: `whatsapp_user`, `contact_id`, `status='completed'`, `timestamp=now()`
  - Disparar a lógica de fidelidade (passo 2)
  - Registrar em `activity_logs` (action `checkin_completed`)

Centralizar essa lógica numa nova RPC `process_checkin_token(p_token, p_company_id, p_contact_id, p_phone)` com `SECURITY DEFINER` para rodar tudo atomicamente e contornar RLS.

### 2. Auto-completar fidelidade

Dentro da mesma RPC:

- Buscar o `fidelity_program` ativo da empresa (`is_active=true`, `company_id`)
- Encontrar ou criar `fidelity_cards` para `(contact_id, fidelity_program_id)` com `status='active'`
- Incrementar `current_stamps += 1`, atualizar `last_checkin_id`
- Se `current_stamps >= target_stamps`:
  - Marcar cartão como `completed`
  - Retornar a `congratulations_message` + `reward` para o webhook enviar de volta ao contato (mensagem outbound via mesmo provedor)
  - Resetar/criar novo cartão ativo para o próximo ciclo

A RPC retorna um JSON com `{ completed: bool, congratulations_message, reward, current_stamps, target_stamps }` para o webhook decidir o que enviar.

### 3. Expirar check-ins pendentes após 30 min

- Criar a edge function `expire-pending-checkins` que faz:
  ```sql
  UPDATE checkin_records
  SET status = 'expired'
  WHERE status = 'pending'
    AND timestamp < now() - interval '30 minutes';
  ```
- Agendar via `pg_cron` para rodar a cada 5 minutos
- Adicionar badge "Expirado" (cinza) na tabela `CheckinRecordsTable.tsx`

### 4. Permitir excluir check-ins manualmente (bônus pequeno)

- Política RLS de DELETE para `checkin_records` (`auth.uid() = user_id` ou admin/manager da empresa)
- Botão de lixeira na tabela em `CheckinRecordsTable.tsx` com confirmação

## Arquivos a editar / criar

**SQL (migration)**
- Criar função `process_checkin_token(...)` com lógica de identificação + fidelidade
- Adicionar política DELETE em `checkin_records`
- Habilitar `pg_cron` e agendar expiração

**Edge Functions**
- `supabase/functions/webhook-n8n-instance/index.ts` — chamar RPC quando casar regex
- `supabase/functions/webhook-meta/index.ts` — idem
- `supabase/functions/webhook-zapi/index.ts` — idem
- `supabase/functions/expire-pending-checkins/index.ts` — novo

**Frontend**
- `src/components/checkin/CheckinRecordsTable.tsx` — badge "Expirado" + "Completo", botão excluir
- `src/hooks/useCheckinRecords.ts` — mutation de exclusão

## Detalhes técnicos importantes

- O token gerado é hex de 8 chars maiúsculo — manter o regex ancorado a esse formato para evitar falsos positivos
- Se a empresa não tiver programa de fidelidade ativo, ainda assim identifica o check-in como `completed` (sem efeito de fidelidade)
- Mensagem de parabéns enviada apenas se `completed=true` retornar `true` — usar o mesmo provedor que recebeu (Meta/Z-API/Native)
- Validar `company_id` da mensagem entrante == `company_id` do `checkin_record` para isolamento multi-tenant
