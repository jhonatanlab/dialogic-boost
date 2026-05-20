## Limpeza de contatos duplicados (variante 12 vs 13 dígitos)

Hoje existem **4 pares de duplicados** no banco — o mesmo problema do "9 do celular" que já corrigi nos webhooks. Vou consolidar todos em um único passo via migration SQL.

### Regra de consolidação

Para cada par detectado `(original_13_digitos, duplicado_12_digitos)` da mesma `company_id`:

1. **Original = contato com 13 dígitos** (com o 9) — é o canônico.
2. **Duplicado = contato com 12 dígitos** — vai ser apagado.
3. Migrar do duplicado → original:
   - `messages.contact_id` e `messages.conversation_id` (apontar para a conversa do original)
   - Se o original ainda não tem conversa, "promover" a conversa do duplicado (trocar `contact_id` para o original) em vez de criar nova.
   - `conversation_events.conversation_id` segue junto.
   - Demais tabelas filhas (`automation_executions`, `automation_followups`, `campaign_contacts`, `contact_notes`, `contact_tags`, `contact_ai_summaries`, `contact_custom_fields`, `activity_logs`, `fidelity_cards`, `checkin_records`) → repontar `contact_id` para o original (ignorando conflitos de unique constraint, ex.: tag já existente).
   - `ai_control` (chaveado por `telefone`): manter só a entrada com 13 dígitos; remover a de 12.
4. Preservar o `name` mais completo (maior length) no original.
5. Após mover tudo, apagar o contato duplicado.

### Caso Kaline (validação manual)

- Original: `e6c43c72…` (`5887…1373`, com 9) — 3 msgs, 1 conversa.
- Duplicado: `85b44478…` (`587…1373`, sem 9) — 15 msgs, 1 conversa, nome mais completo "Kaline Roberta Maria dos Santos".

Após o merge: 1 contato `e6c43c72…`, nome **"Kaline Roberta Maria dos Santos"**, telefone `5587996221373`, 18 mensagens na mesma conversa.

### Entregável

Uma migration única que:
- Cria uma CTE `dup_pairs` com os 4 pares.
- Executa os UPDATEs/DELETEs em ordem segura (filhos → conversas → contatos).
- Usa `ON CONFLICT DO NOTHING` onde houver unique (contact_tags, campaign_contacts).
- Retorna no log o número de linhas movidas por tabela.

### Riscos / fora de escopo

- Não mexe em RLS nem schema.
- Não toca em contatos sem duplicado.
- Se algum par tiver `company_id` divergente (não deveria), é ignorado pelo JOIN.
- Após rodar, qualquer novo cadastro já cai na lógica corrigida do `webhook-leads` / `webhook-n8n-instance`.

Posso aplicar?
