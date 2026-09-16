---
name: WhatsApp VZaps Provider
description: VZaps como tipo de conexão de WhatsApp reaproveitando a estrutura da Evolution/Zapster (whatsapp_instances, cofre, bucket whatsapp-media)
type: feature
---
VZaps (`https://api.vzaps.com`, headers `X-Instance-Token` + `X-Client-Token`, envelope `{ code, success, data }`) é o terceiro tipo de conexão — Evolution e Zapster permanecem intactas; a troca é por número.

- `whatsapp_instances.provider` aceita `evolution | meta | cloud_api | zapster | vzaps`; `instance_id` guarda o ID da instância VZaps; `evolution_base_url` guarda `https://api.vzaps.com`; `vzaps_client_token` guarda o token de cliente (opcional); o token da instância vai no cofre via `save_instance_vzaps_config(p_instance_id, p_vzaps_instance_id, p_instance_token, p_client_token)` (só admin da própria empresa). Leitura pelo RPC genérico `get_instance_evolution_credentials`.
- `webhook-vzaps` (verify_jwt=false): segredo em `?s=<webhook_secret>`; resolve instância por header `X-Instance-ID`/`body.instance_id`; trata `Message` (mídia via `data.media_url` ou `POST /instances/{id}/chat/download{image|video|audio|document}` com campos snake_case → base64, salvando em `whatsapp-media` em `company/conversation/message_id.ext`), `ReadReceipt` (`state` Delivered/Read; ReadSelf ignorado) e `Connected|Disconnected`. Ignora grupos e mensagens `IsFromMe`.
- `test-vzaps-connection` (JWT): ações `test` (/instances/{id}/session/status), `qrcode` (/session/qr) e `register_webhook` (POST /instances/{id}/webhook com eventos separados por vírgula).
- `send-message`: branch VZaps ANTES de Zapster e Evolution — `POST /instances/{id}/chat/send/text` com `{ phone, message }`; confirmação por `data.message_id`; sem ele = falha; nunca faz fallback para n8n.
- Fora de escopo: grupos, botões/listas interativas, enquetes, reações, TypeBot/Chatwoot e o canal Realtime por WebSocket.
