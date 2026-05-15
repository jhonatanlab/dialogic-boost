# Corrigir erro "Missing telefone" no webhook-leads

## Diagnóstico

Verifiquei os logs e a tabela `webhook_logs`. A função está rodando corretamente (testei com sucesso e retornou 200), mas as suas chamadas reais estão sendo rejeitadas com `400 - Missing telefone`.

Payload que seu formulário está enviando:
```json
{
  "nome": "Jhonatan",
  "whatsapp": "(83) 98890-7220",
  "cidade": "Petrolina PE",
  "conta_luz": "400-600",
  "origem": "landing-page-dls"
}
```

A Edge Function hoje só aceita os campos `telefone` ou `phone` — por isso o campo `whatsapp` está sendo ignorado e retorna erro.

## Correção proposta

Atualizar `supabase/functions/webhook-leads/index.ts` para:

1. **Aceitar mais aliases para o telefone** (na ordem):
   `telefone` → `phone` → `whatsapp` → `celular` → `numero` → `tel`

2. **Aceitar mais aliases para o nome**:
   `nome` → `name` → `nome_completo` → `fullname`

3. **Aceitar aliases para email**:
   `email` → `e-mail` → `mail`

4. **Repassar TODO o payload extra como variáveis na welcome_message**:
   Hoje só substitui `{nome}`, `{telefone}`, `{email}`, `{origem}`.
   Vou expandir para substituir qualquer `{campo}` presente no payload (ex: `{cidade}`, `{conta_luz}`), assim você pode usar mensagens como:
   > "Olá {nome}! Vi que você é de {cidade} e tem conta de {conta_luz}…"

5. **Salvar os campos extras no `metadata` da conversa/contato** (em `metadata.extra`) para não perder informação do lead.

Nenhuma mudança em UI, banco ou outras funções — só na edge function.

## Após implantar

Você poderá manter o formulário exatamente como está (enviando `whatsapp`, `cidade`, `conta_luz`) e o webhook passará a aceitar e a usar essas variáveis na mensagem de boas-vindas.