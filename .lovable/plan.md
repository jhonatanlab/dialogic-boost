

## Plano: Corrigir fluxo de Check-in público via WhatsApp

### Problemas identificados

1. **RLS bloqueia acesso público**: A tabela `checkin_links` exige `auth.uid() = user_id` para SELECT, e `checkin_records` exige usuário autenticado para INSERT. Usuários escaneando QR code não estão autenticados — a query falha silenciosamente e redireciona para `/`.

2. **URL do WhatsApp sem número de telefone**: `https://wa.me/?text=...` não especifica o número da empresa, então o WhatsApp não sabe para quem enviar a mensagem.

3. **Página renderiza dentro do app autenticado**: Como o usuário do QR code não está logado, ele cai no fluxo de redirecionamento.

### Solução

**1. Criar Edge Function pública `public-checkin`**
- Recebe o `urlToken` como parâmetro
- Usa `SUPABASE_SERVICE_ROLE_KEY` para buscar o `checkin_link` (bypass de RLS)
- Busca o número de WhatsApp da empresa (da tabela `whatsapp_integrations` ou `companies.phone`)
- Gera o token de check-in e insere o registro em `checkin_records` (via service role)
- Retorna: nome do link, token gerado, e número de WhatsApp da empresa

**2. Atualizar `PublicCheckIn.tsx`**
- Em vez de chamar Supabase diretamente (que falha por RLS), chamar a Edge Function `public-checkin`
- Usar o número de telefone retornado para montar `https://wa.me/{numero}?text=...`
- Manter a UI de confirmação + redirecionamento automático

**3. Guardar número de WhatsApp no checkin_link (opcional mas recomendado)**
- Adicionar coluna `whatsapp_number` na tabela `checkin_links` via migration
- Preencher ao criar o link (campo no formulário de criação)
- A Edge Function usa esse número diretamente

### Arquivos impactados
- `supabase/functions/public-checkin/index.ts` — nova Edge Function
- `src/pages/PublicCheckIn.tsx` — chamar Edge Function em vez de Supabase direto
- Migration SQL — adicionar coluna `whatsapp_number` em `checkin_links`
- `src/components/checkin/CheckinLinksManager.tsx` — campo para número WhatsApp
- `src/hooks/useCheckinLinks.ts` — incluir `whatsapp_number` no create

### Resultado
Ao escanear o QR code, o usuário é redirecionado para o WhatsApp da empresa com uma mensagem pré-preenchida contendo o código do check-in — sem precisar estar logado no EloChat.

