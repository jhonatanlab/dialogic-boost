

## Criar 3 Fluxos de Exemplo de Follow-up por Inatividade

Inserir diretamente no banco de dados 3 automações pré-configuradas com fluxos visuais completos, usando o gatilho de inatividade.

### Fluxo 1 — Follow-up Rápido (30 minutos)
- **Nome**: "Follow-up Rápido — 30 min"
- **Gatilho**: Inatividade de 30 minutos
- **Max follow-ups**: 1
- **Mensagem**: "Oi! Vi que ainda não tivemos retorno. Posso te ajudar com algo? 😊"

### Fluxo 2 — Follow-up Diário (1 dia)
- **Nome**: "Follow-up 24h"
- **Gatilho**: Inatividade de 1440 minutos (1 dia)
- **Max follow-ups**: 2
- **Mensagem**: "Olá! Passando para verificar se ainda precisa de alguma ajuda. Estamos à disposição!"

### Fluxo 3 — Follow-up Longo (3 dias)
- **Nome**: "Reengajamento — 3 dias"
- **Gatilho**: Inatividade de 4320 minutos (3 dias)
- **Max follow-ups**: 1
- **Mensagem**: "Oi! Faz alguns dias que não conversamos. Caso tenha interesse, estamos aqui para te atender. 🙂"

### Detalhes Técnicos

Cada automação será inserida com:
- `trigger_type`: `"inactivity"`
- `inactivity_minutes`: 30 / 1440 / 4320
- `max_followups`: 1 / 2 / 1
- `status`: `"active"`
- `flow_data`: JSON completo com nós (trigger + message) e edges do React Flow

Além disso, corrigir o `handleSave` em `Automations.tsx` (linhas 70-116) para extrair `inactivityMinutes` e `maxFollowups` do trigger node e passá-los ao mutation — sem isso, automações de inatividade criadas pela UI não salvam esses campos corretamente.

