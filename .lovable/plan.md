

## Alterar formato de áudio de WebM para OGG (Opus)

O WhatsApp usa nativamente o formato `audio/ogg; codecs=opus` para mensagens de voz. Atualmente o código grava em `audio/webm`, o que pode causar incompatibilidades.

### Mudanças necessárias — único arquivo: `src/pages/Inbox.tsx`

**4 pontos para alterar:**

1. **Linha 529** — `mimeType` do MediaRecorder: `"audio/ogg;codecs=opus"`
   - Com fallback para `"audio/webm;codecs=opus"` caso o navegador não suporte OGG (Safari)

2. **Linha 571** — Tipo do Blob: usar o mimeType real do recorder

3. **Linha 572** — Nome e extensão do File: `.ogg` em vez de `.webm`

4. **Linha 579-590** — Upload path (`.ogg`), e `mimetype` enviado ao n8n: `"audio/ogg"`

### Lógica de fallback

```text
if MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
  → usar ogg
else
  → manter webm (compatibilidade Safari)
```

Nenhuma mudança no backend ou Edge Function é necessária.

