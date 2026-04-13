

## Plano: Corrigir ordenação de mensagens com sent_at NULL e imagens com URL expirada

### Problema 1: Mensagens fora de ordem
7 mensagens possuem `sent_at = NULL`, fazendo com que apareçam no final do chat (PostgreSQL ordena NULLs por último em ASC).

**Correção:**
1. **Migration**: Backfill novamente `UPDATE messages SET sent_at = created_at WHERE sent_at IS NULL`
2. **Frontend `useMessages.ts`**: Usar `COALESCE(sent_at, created_at)` como fallback permanente, alterando a query para `.order("sent_at", { ascending: true, nullsFirst: false })` — ou melhor, garantir que nunca haverá NULLs com um `DEFAULT now()` na coluna

3. **Migration adicional**: `ALTER TABLE messages ALTER COLUMN sent_at SET DEFAULT now()` — para que inserções futuras sem `sent_at` explícito recebam um valor automático

### Problema 2: Imagens com URL expirada do WhatsApp
As URLs `mmg.whatsapp.net/*.enc` são temporárias e expiram em poucas horas. O N8N deveria estar baixando e re-subindo para o bucket `media-messages` (como fez corretamente com a terceira imagem).

**Correção:** Isso é um problema no fluxo do N8N, não no código da plataforma. O N8N precisa sempre:
- Baixar a mídia do WhatsApp
- Subir para o bucket `media-messages`
- Enviar a URL pública do Storage no payload do webhook

**Ação no código:** Nenhuma alteração necessária — é configuração do N8N.

### Arquivos modificados
- Nova migration SQL (backfill + DEFAULT)
- `src/hooks/useMessages.ts` — não precisa mudar se o backfill + DEFAULT resolver

### Migration SQL
```sql
-- Backfill remaining NULLs
UPDATE public.messages SET sent_at = created_at WHERE sent_at IS NULL;

-- Set default so future inserts always have sent_at
ALTER TABLE public.messages ALTER COLUMN sent_at SET DEFAULT now();
```

