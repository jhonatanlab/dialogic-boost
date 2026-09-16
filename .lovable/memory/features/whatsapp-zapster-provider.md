---
name: WhatsApp Zapster Provider
description: Zapster API como tipo de conexão de WhatsApp reaproveitando a estrutura da Evolution (whatsapp_instances, cofre, bucket whatsapp-media)
type: feature
---
Zapster (`https://api.zapsterapi.com/v1`, `Authorization: Bearer <token>`, limite 3 req/s) é um tipo de conexão adicional — a Evolution permanece intacta e a troca é por número.

- `whatsapp_instances.provider` aceita `evolution | meta | cloud_api | zapster`; `instance_id` guarda o ID da instância Zapster; `evolution_base_url` guarda a base da Zapster; o token vai no cofre via `save_instance_zapster_config(p_instance_id, p_zapster_instance_id, p_token, p_base_url)` (somente admin da própria empresa). Leitura pelo RPC genérico `get_instance_evolution_credentials`.
- `webhook-zapster` (verify_jwt=false): segredo na query string `?s=<webhook_secret>` (a Zapster não envia header customizado); resolve instância por header `X-Instance-ID`; trata `message.received` (baixa `data.content.media.url` para o bucket `whatsapp-media` em `company/conversation/message_id.ext`), `message.sent|delivered|read|failed` (hierarquia de status) e `instance.connected|disconnected|qrcode`.
- `test-zapster-connection` (JWT): ações `test` (GET /wa/instances/{id}, sincroniza status local), `qrcode` (PNG → base64), `register_webhook` (POST /wa/instances/{id}/webhooks).
- `send-message`: branch Zapster ANTES da Evolution — `POST /wa/messages` com `{ instance_id, recipient, text }`; sem `message_id` na resposta = falha; nunca faz fallback para n8n.
- Fora de escopo: grupos, botões interativos, mensagens agendadas, WABA oficial da Zapster.
