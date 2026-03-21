

## Problema
Quando uma mensagem tem `metadata.media_url` com o mesmo conteúdo base64 que o campo `content`, o componente `MediaContent` renderiza a imagem corretamente, mas o texto bruto base64 (67KB+) também é exibido como parágrafo porque `showText` não leva em conta que `hasMedia` já está tratando a mídia.

## Causa Raiz
Na lógica do `ChatBubble` em `src/pages/Inbox.tsx`:
- `hasMedia = true` → `isContentImage = false` (pois exige `!hasMedia`)
- `showText = !isContentImage && rawContent.length > 0 && !isAutoLabel` → `true`
- Resultado: imagem renderizada + texto base64 gigante visível

## Solução

**Arquivo:** `src/pages/Inbox.tsx` (linhas 155-162)

Atualizar a lógica de `showText` para suprimir o texto quando:
1. `hasMedia` é true (mídia já renderizada pelo MediaContent)
2. O conteúdo é claramente uma URL ou data URI (não é texto útil para o usuário)
3. O conteúdo parece ser base64 puro

```text
showText =
  !isContentImage &&
  !hasMedia &&              // ← NOVO: não mostrar texto se mídia já renderizada
  rawContent.length > 0 &&
  !isAutoLabel &&
  !rawContent.startsWith("data:") &&   // ← NOVO
  !isImageUrl(rawContent) &&           // ← NOVO
  !looksLikeBase64;                    // ← NOVO
```

Isso garante que strings de mídia nunca apareçam como texto, independente de virem via `metadata.media_url` ou diretamente no `content`.

