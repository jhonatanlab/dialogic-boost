# Conectar o WhatsApp pela VZaps (mesmo modelo da Zapster)

Dá para fazer igual à Zapster: a VZaps entra como um terceiro tipo de conexão, reaproveitando a mesma tela de administração, o mesmo cadastro de número e o mesmo caminho de envio/recebimento. Evolution e Zapster continuam intactas — a escolha é por empresa/número.

## Como fica para você

1. Em Admin SaaS > WhatsApp, ao escolher a empresa aparece o tipo de conexão: Evolution, Zapster API ou VZaps.
2. Escolhendo VZaps, você informa o ID da instância e o token da instância (mais o token de cliente da conta, se a sua conta exigir). O sistema testa na hora e mostra se está conectada.
3. Botões "Ativar recebimento" e "Gerar QR Code" funcionam no mesmo lugar; o QR vem direto da VZaps e atualiza até conectar.
4. O aviso de "WhatsApp fora do ar" no topo da conversa e o bloqueio de envio passam a valer também para a VZaps.
5. Recebimento de mensagens, confirmações de entregue/lida e o pipeline de IA continuam iguais — só muda quem entrega os eventos.

## Ordem de trabalho

- Etapa 1 — Conexão: campos, salvar credenciais no cofre, teste de conexão e QR Code na administração.
- Etapa 2 — Recebimento: novo endereço de webhook da VZaps, registrado automaticamente com os eventos de mensagem e de conexão.
- Etapa 3 — Envio: texto, imagem, áudio e documento pela VZaps, com erro real na tela quando o número estiver fora.
- Etapa 4 — Teste na empresa em que você está logada, depois DLS Energia Solar e Raízes do Sertão.

Vou precisar do ID e do token da instância VZaps para concluir a Etapa 1; peço de forma segura no momento certo.

## Detalhes técnicos

API: base `https://api.vzaps.com`. Autenticação por instância via headers `X-Instance-Token` + `X-Client-Token` (alternativa: `Authorization: Bearer <JWT>` obtido em `POST /token` com `client_token`/`client_secret`). Envelope de resposta: `{ code, success, data }`.

Banco (`whatsapp_instances`, sem tabela nova):
- Estender o CHECK de `provider` para aceitar `'vzaps'`.
- `instance_id` = ID da instância VZaps; `evolution_base_url` = `https://api.vzaps.com`; token da instância no vault (mesmo padrão `wa_evo_<instance_id>`), lido por `get_instance_evolution_credentials`.
- Nova RPC `save_instance_vzaps_config(p_instance_id, p_vzaps_instance_id, p_instance_token, p_client_token, p_base_url)` — SECURITY DEFINER, admin da própria empresa, gera `webhook_secret` se ausente. O `client_token` (não sensível como o secret) fica em `whatsapp_instances` (coluna nova `vzaps_client_token`) ou também no vault, conforme necessidade.

Edge functions:
- `test-vzaps-connection` (JWT): `test` → `GET /instances/{id}/session/status` (usa `data.connected` e sincroniza `status` local); `qrcode` → `GET /instances/{id}/session/qr` (`data.qr_code` já vem como data URL PNG; tratar `pairing_status`); `register_webhook` → `POST /instances/{id}/webhook` com `{ webhookURL, events: "Message,ReadReceipt,Connected,Disconnected" }`.
- `webhook-vzaps` (`verify_jwt = false`): a VZaps não assina o payload, então o segredo vai na query string (`?s=<webhook_secret>`), igual à Zapster. Trata `Message` (recebidas e enviadas), `ReadReceipt` (campo `state`: `Delivered`, `Read`, `ReadSelf` → hierarquia de status já existente) e `Connected`/`Disconnected` (atualiza `whatsapp_instances.status`). Reaproveita os helpers de `webhook-zapster`/`webhook-evolution` (normalização de telefone, dedupe por `message_id`, findOrCreate contato/conversa, `incoming_messages`, `message_buffer`).
- Mídia recebida: diferente da Zapster, a VZaps entrega os metadados criptografados em `event.Message.imageMessage|audioMessage|videoMessage|documentMessage`. Para gravar no bucket `whatsapp-media` é preciso chamar `POST /instances/{id}/chat/download{image|video|audio|document}` com os campos em snake_case (`media_key`, `file_enc_sha256`, …) e usar o base64 retornado. Mesmo padrão de caminho `company/conversation/message_id.ext`.
- `send-message` e `wa-action`: novo branch VZaps antes de Zapster/Evolution — `POST /instances/{id}/chat/send/text` `{ phone, message }`; mídia via `/chat/send/image|audio|document` aceitando URL pública ou data URL base64 (`file_name` obrigatório em documento). Confirmação pelo `data.message_id`; sem ele = falha, sem fallback para n8n.
- `_shared/vzaps.ts` com base, headers, leitura do envelope e extração de erro.

Frontend:
- `AdminWhatsapp.tsx`: opção "VZaps" no seletor de tipo de conexão, botão de criar conexão, seção com ID da instância + token da instância + token de cliente, testar, ativar recebimento e QR.
- `useWhatsappConnection.ts`: incluir `vzaps` no filtro de providers e chamar `test-vzaps-connection` quando for o caso.
- `useMessages.ts` / `Inbox.tsx`: sem mudança de contrato.

Fora de escopo agora: grupos, botões/listas interativas, enquetes, reações, TypeBot/Chatwoot e o canal Realtime por WebSocket (usamos webhook).
