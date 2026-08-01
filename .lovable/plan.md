## Objetivo

Quando a IA identificar o nome real do lead e devolver `##NOME_REAL:Jhonatan##` no meio da resposta:
1. O nome do contato é atualizado em Detalhes (tabela `contacts`).
2. A marcação é removida antes de enviar ao WhatsApp e antes de gravar em `messages`.

## Abordagem recomendada

Manter a marcação inline (é simples e já é o que o seu prompt faz), mas tratá-la em **duas camadas**, para funcionar tanto no pipeline nativo quanto no fluxo n8n:

**Camada 1 — Pipeline nativo (`supabase/functions/ai-process/index.ts`)**
- Após receber o texto do LLM, aplicar um parser: regex `/##\s*NOME_REAL\s*:\s*([^#]{1,60})##/i`.
- Extrair o nome, limpar o texto (remover a marcação e espaços duplos resultantes).
- Persistir em `messages` e enviar via `send-message` **somente o texto limpo**.
- Se um nome foi capturado e passar na validação, atualizar `contacts.name` daquele `contact_id`, registrar em `activity_logs` (`action: 'contact_name_ai_updated'`, detalhes com nome antigo/novo) e guardar em `messages.metadata.detected_name`.

**Camada 2 — Rede de segurança no banco (cobre n8n e qualquer outro caminho)**
- Trigger `BEFORE INSERT` em `public.messages` (security definer) para mensagens `outbound`:
  - se o `content` contiver a marcação, remove a marcação do `content` gravado e atualiza `contacts.name` do contato da mensagem.
- Assim, mesmo que a resposta venha pelo n8n (que insere direto em `messages`), o nome é atualizado e a marcação nunca fica visível no histórico.
- Observação: o trigger não impede o envio da marcação pelo n8n (o n8n envia o texto ao WhatsApp fora do Supabase). Se você usa n8n em produção para essas empresas, o ideal é também remover a marcação lá no fluxo; posso documentar o regex a usar.

**Camada 3 — Fallback de renderização**
- Sanitizar no `ChatBubble` (Inbox) removendo qualquer `##...##` residual, para garantir que nada apareça na tela em conversas antigas.

## Regras de validação do nome (para não sobrescrever com lixo)

Só atualiza `contacts.name` quando:
- tem 2 a 60 caracteres, só letras/acentos/espaços/hífen/apóstrofo;
- não é igual ao nome atual (case-insensitive);
- não é um placeholder (`cliente`, `lead`, `desconhecido`, `não informado`, número de telefone).
Capitaliza cada palavra (`jhonatan silva` → `Jhonatan Silva`).

## Ajuda ao prompt do agente

Na página **Agente IA**, adicionar um bloco informativo com a instrução pronta para colar no system prompt, ex.:

```text
Quando o cliente informar o nome dele, inclua na sua resposta a marcação
##NOME_REAL:Nome## exatamente uma vez. A marcação é removida
automaticamente e nunca é vista pelo cliente.
```

Sem mudança de schema além do trigger/função.

## Alternativa (se preferir mais robusto no futuro)

Usar tool calling / structured output no LLM em vez de marcação em texto (o modelo devolve `{"reply": "...", "detected_name": "..."}`). É mais confiável, mas exige mudar o cliente LLM compartilhado e cada provedor (OpenAI/Anthropic/Groq). Recomendo começar com a marcação inline, que já está funcionando no seu prompt, e migrar depois se necessário.
