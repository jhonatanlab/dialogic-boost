# Conectar o WhatsApp pela Zapster (reaproveitando a estrutura atual)

Sim: dá para montar a Zapster reaproveitando quase tudo que já existe para a Evolution. A mesma tela de administração, o mesmo cadastro de número e o mesmo caminho de envio/recebimento passam a aceitar "Zapster" como tipo de conexão. Nada da Evolution é removido — as empresas que já estão nela continuam funcionando, e a troca é feita número por número.

## Como fica para você

1. Em Admin > WhatsApp, cada empresa passa a escolher o tipo de conexão: Evolution (atual) ou Zapster.
2. Escolhendo Zapster, você informa o token de acesso da conta e o ID da instância; o sistema testa a conexão na hora e mostra se está conectada.
3. Botão "Gerar QR Code" continua no mesmo lugar; com Zapster ele busca o QR direto da Zapster e atualiza sozinho até conectar.
4. O aviso de "WhatsApp fora do ar" no topo da conversa e o bloqueio de envio passam a valer também para a Zapster.
5. Recebimento de mensagens (texto, foto, áudio, vídeo, documento), confirmações de entregue/lida e o pipeline de IA continuam iguais — só muda quem entrega os eventos.

## Ordem de trabalho

- Etapa 1 — Preparar a conexão: campos, teste de conexão e QR Code na tela de administração. Sem tráfego real ainda.
- Etapa 2 — Recebimento: novo endereço de webhook para a Zapster, registrado automaticamente na instância com os eventos de mensagem e de conexão.
- Etapa 3 — Envio: envio de texto, mídia e áudio pela Zapster, com erro real na tela quando o número estiver fora.
- Etapa 4 — Teste na empresa em que você está logada agora, depois Raízes do Sertão e DLS Energia Solar.

Preciso do token da Zapster antes da Etapa 1 terminar; vou pedir de forma segura no momento certo.

## Detalhes técnicos

Base: `https://api.zapsterapi.com/v1`, autenticação `Authorization: Bearer <token>` (token por conta), limite de 3 req/s (tratar `429` com backoff).

Banco (`whatsapp_instances`, sem tabela nova):
- `provider` passa a aceitar `'zapster'`; `instance_id` guarda o ID da instância Zapster.
- Token reaproveita o cofre já existente: `save_instance_evolution_config` / `set_instance_evolution_api_key` e `get_instance_evolution_credentials` ganham uso genérico (o `api_key` vira o Bearer token; `base_url` default `https://api.zapsterapi.com/v1`). Sem migração destrutiva — apenas ajuste do `CHECK` de `provider` e default de `base_url`.
- `webhook_secret` continua sendo o segredo de entrada, mas como a Zapster não envia header customizado, ele vai na query string do webhook (`?s=<secret>`).

Edge functions:
- `webhook-zapster` (nova, `verify_jwt = false`): valida `?s=`, resolve a instância por `X-Instance-ID`, e trata `message.received` (texto/mídia — baixa `data.content.media.url` e sobe em `whatsapp-media`, mesmo padrão de path `company/conversation/message_id.ext`), `message.sent|delivered|read|failed` (hierarquia de status já existente), `instance.connected|disconnected|qrcode` (atualiza `whatsapp_instances.status` e o QR). Reaproveita helpers de `webhook-evolution` (normalização de telefone, dedupe por `message_id`, findOrCreate contato/conversa, `incoming_messages`, `message_buffer`).
- `send-message`: novo branch antes do Evolution — se existe instância `provider='zapster'` `connected`, envia `POST /wa/messages` com `{ instance_id, recipient, text }` ou `{ media: { url|base64, caption, ptt, fileName } }`; usa `message_id` da resposta como confirmação (sem `message_id` = falha, mesma regra atual) e não faz fallback para n8n.
- `test-zapster-connection` (nova, JWT): `GET /wa/instances/{id}` → `status`, e `GET /wa/instances/{id}/qrcode` para o QR (PNG → base64). Alternativa: estender `test-evolution-connection`/`evolution-qr` com branch por provider; prefiro funções separadas para não arriscar o caminho Evolution em produção.
- `POST /wa/instances/{id}/webhooks` chamado na gravação da configuração, com `events: ['message.received','message.sent','message.delivered','message.read','instance.connected','instance.disconnected','instance.qrcode']`.

Frontend:
- `AdminWhatsapp.tsx`: seletor de provider, campos Token + Instance ID, botão testar, QR via a função da Zapster.
- `useWhatsappConnection.ts`: consultar instância sem filtrar `provider='evolution'` e chamar a função de teste correta conforme o provider (hoje o filtro esconde instâncias Zapster e o banner nunca aparece).
- `useMessages.ts` / `Inbox.tsx`: nenhuma mudança de contrato — continuam usando `wa-action`/`send-message`.

Fora de escopo agora: grupos, botões interativos, mensagens agendadas e conexão oficial WABA da Zapster.
