

## Diagnóstico

O código do frontend **já envia** o `file_name` no payload para o n8n (linha 92 do `useMessages.ts`). Porém há dois pontos que podem causar o problema:

1. **Upload no Storage com nome genérico**: Na linha 610 do `Inbox.tsx`, o arquivo é salvo como `${Date.now()}.${fileExt}` (ex: `1711475123456.pdf`). A URL pública resultante carrega esse nome. Se o n8n ou a API do WhatsApp usa o nome da URL em vez do campo `file_name`, o arquivo chega com nome numérico.

2. **UI mostra "Documento" fixo**: Na linha 108, o nome exibido no chat é hardcoded como `"Documento"` em vez de usar o `file_name` salvo no metadata.

Se o problema é **no WhatsApp** (o destinatário recebe com nome errado), isso depende de como o n8n repassa o `file_name` para a API. O campo já está sendo enviado corretamente pelo app. Pode ser que o n8n não esteja usando esse campo — isso seria ajuste no lado do n8n.

Se o problema é **na UI do chat** (o remetente vê "Documento" em vez do nome real), a correção é no frontend.

## Solução

### 1. Preservar nome original no upload do Storage
Alterar o `filePath` para incluir o nome original do arquivo (sanitizado), mantendo o prefixo de timestamp para evitar colisões:

```
// Antes: `${companyId}/${Date.now()}.${fileExt}`
// Depois: `${companyId}/${Date.now()}_${sanitizedFileName}`
```

### 2. Exibir nome real do arquivo na UI do chat
No componente `renderMedia`, usar o `file_name` do metadata em vez de "Documento" fixo:

```typescript
const docName = (msg.metadata as any)?.file_name || "Documento";
```

### 3. Garantir nome no content do documento
Salvar o nome do arquivo no campo `content` da mensagem quando for um documento sem texto, para que fique visível em previews e na lista de conversas.

## Arquivos impactados
- `src/pages/Inbox.tsx` — Upload path com nome original + renderização com nome real

