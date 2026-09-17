# Agente sem responder e conversa sem marcar mensagem nova

## O que os dados mostram

Verificado agora no banco, na conversa da DLS Energia Solar que recebeu "Olá, quero um orçamento" às 19:31 e "?" às 19:33:

1. **Agente não respondeu:** a fila de processamento dessa conversa está com status "failed" e o motivo registrado é `missing_llm_config` — a empresa DLS está com o Agente IA ligado, provedor OpenAI e modelo gpt-4o-mini, mas **sem chave de IA salva**. Sem a chave, o agente não consegue gerar resposta. (A empresa Raízes do Sertão tem chave salva; a DLS não.)
2. **Não apareceu como nova:** a conversa existia antes, e o recebimento da VZaps só marca "1 nova" quando cria uma conversa nova. Em conversa já existente o contador de não lidas fica em 0 — foi exatamente o que aconteceu (contador 0 com duas mensagens recebidas).

## Correções

**A. Contador de mensagens novas (VZaps, e mesmo defeito nos outros recebimentos)**
- Ao receber mensagem em conversa já existente, somar 1 ao contador de não lidas, além de atualizar a data da última mensagem.
- Não somar quando a mensagem é do próprio atendente (saída) nem em eventos de status.
- Aplicar o mesmo ajuste nos recebimentos Zapster e Evolution, que têm o mesmo comportamento.

**B. Agente sem responder**
- A chave de IA da DLS precisa ser salva na página Agente IA (agora que salvar já funciona para gerentes). Sem ela nenhuma correção de código faz o agente responder.
- Para não perder as mensagens já enfileiradas: reprocessar as entradas da fila que falharam por falta de configuração, reativando-as para nova tentativa.
- Melhorar a visibilidade da falha: quando faltar chave/modelo, registrar mensagem clara nos registros e não gastar as 3 tentativas silenciosamente.

## Detalhes técnicos
- `supabase/functions/webhook-vzaps/index.ts` (bloco da conversa existente, ~linha 437): após resolver `conversationId` de conversa existente, ler `unread_count` e atualizar `unread_count: unread + 1` para mensagens inbound; reaproveitar a mesma lógica no caminho de reabertura de conversa fechada. Mesmo ajuste em `webhook-zapster/index.ts` (~264) e `webhook-evolution/index.ts` (~364).
- Fila: linha em `message_buffer` com `status='failed'`, `attempts=3`, `last_error='missing_llm_config'` para a conversa `ae26d8cd…`. Resetar para `status='pending'`, `attempts=0`, `flush_at=now()` depois que a chave existir.
- `supabase/functions/ai-process/index.ts`: distinguir erro de configuração (sem chave/modelo) de erro transitório — não consumir tentativas e devolver mensagem explícita.
- Republicar apenas as funções alteradas.

## Validação
Salvar a chave de IA da DLS, enviar uma mensagem do celular e confirmar duas coisas: a conversa aparece com marcador de mensagem nova em Conversas, e o agente responde.
