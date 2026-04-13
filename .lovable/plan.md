

## Plan: AI Summaries no Painel + Reabertura para Fila

### Resumo
Duas melhorias: (1) adicionar uma seção de "Resumos da IA" no painel lateral de detalhes do contato, preenchida pelo N8N via API REST, e (2) ao reabrir uma conversa fechada (quando chega mensagem inbound), limpar o `assigned_to` e `assigned_team` para que volte à fila.

---

### 1. Resumos da IA no painel lateral

**Banco de dados:**
- Criar tabela `contact_ai_summaries` com colunas: `id`, `contact_id`, `company_id`, `summary` (text), `created_at`, `updated_at`
- RLS: leitura para usuários autenticados da mesma empresa (`company_id = get_user_company_id()`), e política permissiva para INSERT/UPDATE (o N8N usará service_role key, que bypassa RLS)

**Frontend — Inbox (Col 3, aba "Detalhes"):**
- Após a seção de Atendente/Equipe e antes das Etiquetas, adicionar um card "Resumo IA" que exibe o último resumo do contato
- Query: buscar de `contact_ai_summaries` filtrado por `contact_id`, ordenado por `created_at desc`, limit 1
- Mostrar texto do resumo com data/hora da última atualização
- Estado vazio: "Nenhum resumo disponível"

**Frontend — ContactDetails.tsx (CRM de Contatos):**
- Adicionar a mesma seção de resumo IA na aba "Detalhes", após as informações de contato

**N8N:** O agente de resumo do N8N fará INSERT/UPDATE diretamente na tabela via API REST com service_role key.

---

### 2. Reabertura de conversa volta para fila

**Edge Function `webhook-n8n-instance`:**
- Na função `findOrCreateConversation` (linha ~170), quando o status é `closed`, além de mudar para `open`, também limpar `assigned_to` e `assigned_team` para `null`
- Mudança: `{ status: "open" }` → `{ status: "open", assigned_to: null, assigned_team: null }`

Isso garante que quando um cliente volta a falar (e a IA responde), a conversa reabre na fila sem vínculo com o atendente anterior.

---

### Detalhes técnicos

**Migration SQL:**
```sql
CREATE TABLE public.contact_ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  company_id uuid,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company summaries"
  ON public.contact_ai_summaries FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert company summaries"
  ON public.contact_ai_summaries FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER update_contact_ai_summaries_updated_at
  BEFORE UPDATE ON public.contact_ai_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Arquivos modificados:**
- `supabase/functions/webhook-n8n-instance/index.ts` — limpar assigned_to/assigned_team na reabertura
- `src/pages/Inbox.tsx` — adicionar seção Resumo IA na aba Detalhes
- `src/components/contacts/ContactDetails.tsx` — adicionar seção Resumo IA

