

## Problema

Quando uma mensagem de imagem (ou vídeo/documento) chega com legenda (caption), o campo `content` contém o texto da legenda e `media_url` contém a imagem. Porém, no ChatBubble, a condição `showText` exige `!hasMedia` — ou seja, se tem mídia, o texto nunca aparece. A legenda é silenciosamente descartada na renderização.

## Solução

Alterar a lógica do `showText` no componente `ChatBubble` para permitir exibir texto **junto com mídia**, desde que o texto não seja um label automático nem a própria URL/base64 da imagem.

### Mudança — `src/pages/Inbox.tsx`

**Lógica atual (linha 160-167):**
```typescript
const showText =
    !isContentImage &&
    !hasMedia &&          // ← bloqueia texto quando tem mídia
    rawContent.length > 0 &&
    !isAutoLabel &&
    !rawContent.startsWith("data:") &&
    !isImageUrl(rawContent) &&
    !looksLikeBase64;
```

**Nova lógica:**
```typescript
const showText =
    !isContentImage &&
    rawContent.length > 0 &&
    !isAutoLabel &&
    !rawContent.startsWith("data:") &&
    !isImageUrl(rawContent) &&
    !looksLikeBase64;
```

Remover apenas o `!hasMedia` da condição. Isso permite que legendas de imagens, vídeos e documentos apareçam abaixo da mídia no balão, exatamente como no WhatsApp.

### Arquivo impactado
- `src/pages/Inbox.tsx` — uma linha removida na condição `showText`

