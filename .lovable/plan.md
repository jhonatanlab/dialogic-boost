
## Motivo do ocorrido

O follow-up aconteceu porque a mensagem inbound desse contato entrou no sistema vinculada à empresa **ELOHUB**, não à **DLS Energia Solar**.

Pelo que foi encontrado nos dados:

- O mesmo telefone existe em duas empresas:
  - **DLS Energia Solar**: conversa antiga do contato Kleber.
  - **ELOHUB**: uma conversa nova criada para o mesmo telefone.
- Na conversa da **ELOHUB**, entrou a mensagem inbound **“OI”** às 20:26.
- Depois de mais de 30 minutos sem resposta, a automação ativa da **ELOHUB** chamada **“Follow-Up — 30 minutos”** disparou às 20:58.
- Por isso apareceu o follow-up onde não deveria.

Ou seja: o problema não foi a regra do follow-up em si. O problema foi antes: o webhook recebeu/processou esse contato usando o `company_id` da ELOHUB, então o sistema entendeu que a conversa pertencia à ELOHUB.

## Causa técnica provável

A função `webhook-n8n-instance` hoje confia no `company_id` enviado pelo n8n no payload.

Então, se o n8n mandar:

```text
company_id = ELOHUB
phone = telefone do Kleber
```

o sistema cria ou reabre o contato/conversa dentro da ELOHUB, mesmo que aquele número de atendimento seja da DLS Energia Solar.

Além disso, o sistema ainda precisa de travas extras para impedir que automações sejam executadas quando contato, conversa e empresa não batem exatamente.

## Plano de correção

### 1. Blindar o recebimento de mensagens por empresa

Vou ajustar `supabase/functions/webhook-n8n-instance/index.ts` para não confiar cegamente no `company_id` recebido.

A nova regra será:

- Se o payload trouxer `instance_id`, o sistema tentará resolver a empresa real pela instância cadastrada.
- Se a instância pertencer à DLS, a mensagem será processada como DLS.
- Se a instância pertencer à ELOHUB, será processada como ELOHUB.
- Se houver divergência entre `company_id` recebido e empresa da instância, o sistema vai:
  - registrar log de alerta;
  - usar a empresa correta da instância;
  - ou rejeitar o evento, se não for possível resolver com segurança.

Isso evita que uma mensagem da DLS crie conversa dentro da ELOHUB.

### 2. Impedir automações com dados cruzados

Vou reforçar `supabase/functions/execute-automation/index.ts` para validar antes de enviar qualquer mensagem:

- a automação precisa pertencer ao mesmo `company_id`;
- a conversa precisa pertencer ao mesmo `company_id`;
- o contato precisa pertencer ao mesmo `company_id`;
- a conversa precisa estar ligada ao contato correto.

Se qualquer uma dessas validações falhar, a automação não executa.

### 3. Remover fallback perigoso de envio global

Hoje o motor de automação pode usar um fallback global de `n8n_send_message` se não encontrar endpoint específico da empresa.

Vou remover/limitar esse fallback para evitar que uma empresa use, por engano, endpoint de outra empresa.

A regra será:

- primeiro: endpoint da própria empresa;
- depois: endpoint do usuário da própria empresa;
- nunca usar endpoint aleatório/global de outra empresa.

### 4. Reforçar o worker de follow-up por inatividade

Vou ajustar `supabase/functions/process-inactivity-followups/index.ts` para buscar conversas com validação mais rígida:

- conversa da mesma empresa da automação;
- contato da mesma empresa da automação;
- conversa aberta;
- sem atendente atribuído;
- última mensagem inbound válida;
- contato/conversa consistentes antes de chamar a automação.

Isso reduz o risco de follow-up disparar em conversas criadas de forma incorreta.

### 5. Corrigir os dados afetados

Vou revisar os registros desse telefone na empresa ELOHUB e DLS.

A correção segura será:

- manter o contato/conversa correto na **DLS Energia Solar**;
- remover ou arquivar o contato/conversa criado incorretamente na **ELOHUB**;
- remover o registro de follow-up indevido da ELOHUB para esse contato/conversa;
- preservar o histórico real da DLS.

Antes de remover dados, vou limitar a correção ao telefone/contato afetado para não impactar outros contatos.

### 6. Melhorar logs para rastrear novos casos

Vou adicionar logs mais claros nos webhooks:

- empresa recebida no payload;
- empresa resolvida pela instância;
- telefone normalizado;
- contato criado/reutilizado;
- conversa criada/reutilizada;
- motivo quando uma automação for bloqueada por divergência de empresa.

## Arquivos envolvidos

- `supabase/functions/webhook-n8n-instance/index.ts`
  - validar empresa pela instância;
  - impedir criação de conversa na empresa errada.

- `supabase/functions/execute-automation/index.ts`
  - validar consistência entre automação, conversa, contato e empresa;
  - remover fallback global perigoso de endpoint.

- `supabase/functions/process-inactivity-followups/index.ts`
  - validar contato/conversa antes de executar follow-up.

- Banco de dados
  - corrigir o registro indevido do contato/conversa/follow-up na ELOHUB, preservando o histórico correto da DLS.

## Resultado esperado

Depois da correção:

- Mensagens da DLS não criarão conversas na ELOHUB.
- O follow-up da ELOHUB não será disparado para contatos que pertencem à DLS.
- Automações só rodarão quando contato, conversa e empresa estiverem consistentes.
- Endpoints de envio não serão compartilhados indevidamente entre empresas.
- O caso do Kleber será limpo para manter apenas o histórico correto na empresa DLS.
