
Objetivo: corrigir definitivamente o disparo por palavra-chave nas automações.

Diagnóstico confirmado
- A automação salva no banco está inconsistente:
  - `trigger_type = first_message`
  - `keyword = null`
  - mas dentro do `flow_data` o nó de gatilho tem `triggerType = keyword` e `keyword = "Quero a lista!"`
- O webhook que decide se dispara a automação lê apenas as colunas da tabela (`trigger_type` e `keyword`), não o nó visual.
- Resultado: a mensagem recebida nunca dá match, então:
  - não aparece log de “Triggering automation”
  - a função `execute-automation` nem chega a ser chamada.

Plano de correção

1. Unificar a fonte de verdade do gatilho
- Ajustar `src/pages/Automations.tsx` para, no salvar:
  - localizar o nó `trigger` dentro de `flow_data.nodes`
  - extrair dele `triggerType` e `keyword`
  - gravar esses valores nas colunas `trigger_type` e `keyword`
- Se o header também continuar exibindo gatilho/palavra-chave, ele deve ser sincronizado com o nó trigger ao abrir/editar a automação.

2. Tornar o backend resiliente a dados antigos ou inconsistentes
- Ajustar `supabase/functions/webhook-n8n-instance/index.ts` para buscar também `flow_data`.
- Antes de verificar match:
  - usar `trigger_type/keyword` da tabela se estiverem corretos
  - se estiverem vazios ou divergentes, derivar o gatilho do nó `trigger` salvo no `flow_data`
- Assim o disparo funciona mesmo para automações antigas já salvas com dados errados.

3. Corrigir automações já existentes
- Criar uma migração para backfill da tabela `automations`, copiando:
  - `triggerType` do nó `trigger` → `trigger_type`
  - `keyword` do nó `trigger` → `keyword`
- Isso corrige imediatamente as automações já criadas, sem exigir recriar tudo.

4. Melhorar logs do disparo
- No webhook, registrar:
  - texto recebido
  - gatilho efetivo resolvido
  - motivo do match ou não-match
- Ao chamar `execute-automation`, parar de fazer apenas fire-and-forget:
  - capturar status da resposta
  - logar erro de execução se a função responder 4xx/5xx
- Isso evita novo “silêncio” quando algo falhar.

5. Validar o fluxo completo
- Testar o cenário real:
  - automação ativa com gatilho por palavra-chave
  - mensagem inbound contendo a palavra
  - criação dos logs
  - incremento de `execution_count`
  - atualização de `last_execution`
  - envio da resposta automática no chat

Arquivos impactados
- `src/pages/Automations.tsx`
- `supabase/functions/webhook-n8n-instance/index.ts`
- migração SQL para `automations`

Detalhes técnicos
- Causa raiz: hoje existem 2 lugares para configurar gatilho:
  1. campos do topo da tela
  2. dados do nó visual `trigger`
- Esses dois pontos ficaram dessincronizados.
- A correção ideal é garantir consistência no save e tolerância no backend.
- Com isso, mesmo que uma automação antiga esteja “quebrada” no banco, o webhook ainda consegue dispará-la corretamente.
