## Diagnóstico

O nó **Sync Inbound EloChat1** do n8n chama a edge function `webhook-n8n-instance` (ação `upsert_message`), que **resolve a empresa pelo `instance_id` registrado** na tabela `whatsapp_instances` — não confia no `company_id` do payload (proteção multi-tenant).

Log da edge function confirma:

```
[company-resolution] blocked: instance_id not registered
  payloadCompanyId: 51a5410b-77e7-433a-89c0-edad31e6005f
  instanceId: inst_raizesdosertao
```

E a consulta ao banco mostra que a empresa **Raízes do Sertão Restaurante** não tem nenhum registro em `whatsapp_instances`. Por isso a função retorna **409 "Unable to resolve company from registered instance"**.

O n8n manda `instance_id = "inst_raizesdosertao"`, mas esse identificador nunca foi gravado no banco. Provavelmente o fluxo de provisionamento (`register_instance` / QR Code do Instagram) não chegou a persistir essa linha, ou foi feito manualmente no n8n sem chamar o endpoint de registro.

## Correção (uma migration de dados, sem alterar código)

Inserir manualmente a instância para essa empresa, espelhando o padrão das outras (`instance_id` igual ao `hash`, status `connected`):

```sql
INSERT INTO public.whatsapp_instances (
  company_id, user_id, company_name, instance_id, hash, status
)
SELECT
  '51a5410b-77e7-433a-89c0-edad31e6005f'::uuid,
  p.user_id,
  'Raízes do Sertão Restaurante',
  'inst_raizesdosertao',
  'inst_raizesdosertao',
  'connected'
FROM public.profiles p
WHERE p.company_id = '51a5410b-77e7-433a-89c0-edad31e6005f'
  AND p.role = 'admin'
ORDER BY p.created_at ASC
LIMIT 1;
```

Após essa inserção:
- A próxima mensagem do Instagram que passar pelo nó **Sync Inbound EloChat1** será aceita (200) e gravada na conversa correta da empresa.
- O fluxo de envio também passa a resolver porque usa a mesma tabela.

## Validação

1. Confirmar com `SELECT * FROM whatsapp_instances WHERE company_id = '51a5410b-...';` que a linha existe.
2. Enviar nova mensagem no Instagram conectado.
3. Conferir log da função `webhook-n8n-instance` — não deve mais aparecer "blocked: instance_id not registered".
4. Mensagem deve aparecer na Inbox da empresa.

## Observação importante

Se você quer evitar fazer isso manualmente toda vez, o ideal é que o **fluxo do n8n que conecta a instância** (QR Code / pareamento) chame a ação `register_instance` da `webhook-n8n-instance` no momento do `connected`, gravando `instance_id`, `hash` e `company_id` automaticamente. Posso revisar essa parte do provisionamento numa próxima rodada se quiser.

## Próximo passo

Aprove o plano para eu criar a migration com o `INSERT` acima.
