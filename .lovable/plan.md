

## Por que a campanha aparece como "Rascunho"

A campanha "TESTE 01" foi salva no banco com `scheduled_at: null`, o que significa que foi criada com a opção "Enviar agora" (não "Agendar"). Nesse caso, o código define `status = 'draft'` porque não há data agendada.

O problema: quando o usuário escolhe "Enviar agora", a campanha deveria ter status `sending` (ou iniciar o envio imediatamente), não ficar como rascunho.

### Correção

**Arquivo: `src/hooks/useCampaigns.ts`** (linha 71)

Alterar a lógica de status na criação:
- Se `scheduledAt` foi fornecido → status = `scheduled`
- Se não tem `scheduledAt` (enviar agora) → status = `sending`
- Manter `draft` apenas se explicitamente solicitado (ex: salvar sem enviar)

```typescript
// Antes
const status = campaign.scheduledAt ? 'scheduled' : 'draft';

// Depois
const status = campaign.scheduledAt ? 'scheduled' : 'sending';
```

**Arquivo: `src/pages/NewCampaign.tsx`** (linha 158)

Também passar a mensagem real do template selecionado em vez do texto fixo "Mensagem da campanha":

```typescript
message: selectedTemplate?.message || data.modelo_disparo,
```

### Resumo
- Uma linha alterada em `useCampaigns.ts`
- Uma linha ajustada em `NewCampaign.tsx` (mensagem real do template)

