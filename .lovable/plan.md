# Áudio e imagem recebidos pela VZaps

## Diagnóstico confirmado

Consultei as mensagens recebidas pela VZaps. O áudio enviado às 16:59 (28 segundos, do contato Anselmo) chegou ao EloChat, mas foi gravado como mensagem de texto vazia: o registro do WhatsApp veio com os nomes dos campos em outro formato (`audio_message`, `image_message`) do que o recebimento espera (`audioMessage`, `imageMessage`). Como não reconhece o bloco de mídia, o sistema não identifica o tipo, não baixa o arquivo e salva uma mensagem em branco — foi o que aconteceu com as três últimas mensagens sem texto.

## O que será feito

1. Reconhecer os dois formatos de nome de campo no recebimento da VZaps, para áudio, imagem, vídeo, documento e figurinha.
2. Usar também a informação de tipo que a VZaps envia junto (por exemplo "ptt" para áudio de voz) como confirmação do tipo da mensagem.
3. Ler legenda, nome do arquivo e tipo do arquivo nos dois formatos, para o documento baixar com o nome e a extensão certos.
4. Manter o download da mídia pela própria VZaps e o armazenamento no depósito privado, como já funciona nas outras conexões.
5. Publicar o recebimento e validar com um novo áudio e uma nova imagem: devem aparecer no chat como player de áudio e como foto, abrindo na visualização ampliada.

## Detalhes técnicos

- `supabase/functions/webhook-vzaps/index.ts`: a detecção `waMessage?.imageMessage | videoMessage | audioMessage | documentMessage | stickerMessage` passa a aceitar as variantes snake_case (`image_message`, `video_message`, `audio_message`, `document_message`, `sticker_message`); `mediaNode` resolvido pela chave efetivamente encontrada em vez de `${key}Message` fixo.
- Tipo reforçado por `info.media_type` / `info.type === "media"` (ptt → audio).
- Conteúdo/legenda: `conversation`, `extended_text_message.text` além de `extendedTextMessage.text`; `mediaNode.file_name`/`fileName`; `mimetype` normalizado (remove `; codecs=opus` ao derivar extensão → `ogg`).
- O endpoint de download (`/instances/{id}/chat/download{image|video|audio|document}`) continua recebendo o nó já em snake_case; o `toSnakeCase` permanece idempotente.
- Fora de escopo: as três mensagens vazias já gravadas permanecem como estão (a chave de descriptografia da mídia antiga pode já ter expirado); o envio e os demais provedores não mudam.
