

## Diagnóstico

### 1. PDF chega como TXT no WhatsApp
O payload enviado ao n8n contém `type: "document"`, `media_url` e `mimetype: "application/pdf"`, mas **não inclui o nome do arquivo** (`fileName`). A maioria das APIs do WhatsApp (Evolution, Z-API, Meta) exige o campo `fileName` (ou `filename`) para determinar a extensão do arquivo. Sem ele, a API assume texto/genérico e entrega como `.txt`.

**Correção:** Incluir o nome original do arquivo no payload enviado ao n8n.

### 2. Documento duplicado na conversa
A deduplicação no frontend compara `r.content === msg.content`. Para documentos, o registro temporário salva `content: ""` (texto vazio), mas o n8n pode retornar o conteúdo como o nome do arquivo ou outra string — quebrando a comparação por igualdade. Além disso, a reconciliação fuzzy no backend também compara por `content`, falhando pelo mesmo motivo.

**Correção:** Ajustar a deduplicação para considerar mensagens de mídia (com `media_url` no metadata) como candidatas à reconciliação, independente do content textual.

---

## Solução

### Arquivo 1: `src/hooks/useMessages.ts`

1. Aceitar novo parâmetro `fileName` no `sendMessage`
2. Incluir `fileName` no metadata da mensagem salva no banco
3. Incluir `fileName` (como `file_name`) no payload enviado ao n8n

### Arquivo 2: `src/pages/Inbox.tsx`

1. Na chamada `handleSendMessage`, passar `attachedFile.name` como `fileName`
2. Ajustar a lógica de deduplicação `allMessages`: para mensagens do tipo `document`/`image`/`video`/`audio` (com `media_url` no metadata), comparar pela `media_url` em vez de `content`

### Arquivo 3: `supabase/functions/webhook-n8n-instance/index.ts`

1. Na reconciliação fuzzy (Strategy 3 do `upsert_message`), além de comparar por `content`, adicionar fallback que compara pela `media_url` do metadata quando o content é vazio ou genérico

---

## Detalhes técnicos

**Payload para n8n (antes):**
```json
{ "type": "document", "media_url": "https://...", "mimetype": "application/pdf" }
```

**Payload para n8n (depois):**
```json
{ "type": "document", "media_url": "https://...", "mimetype": "application/pdf", "file_name": "contrato.pdf" }
```

**Deduplicação frontend (antes):**
```typescript
r.content === msg.content
```

**Deduplicação frontend (depois):**
```typescript
// Para mídia: comparar por media_url do metadata
const rMedia = (r.metadata as any)?.media_url;
const msgMedia = (msg.metadata as any)?.media_url;
const contentMatch = (rMedia && msgMedia) ? rMedia === msgMedia : r.content === msg.content;
```

**Reconciliação fuzzy no backend (antes):**
```typescript
.eq("content", messageContent)
```

**Reconciliação fuzzy no backend (depois):**
Se `messageContent` for vazio e `media_url` existir, buscar por `media_url` no metadata via `containedBy` ou filtro JSON.

