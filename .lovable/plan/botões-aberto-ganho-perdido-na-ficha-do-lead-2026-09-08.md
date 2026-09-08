# Botões Aberto / Ganho / Perdido na ficha do lead

## O que muda

No topo da ficha do lead (ao lado do X, onde está a marcação), aparecem três botões de situação:

- **Aberto** — lead em andamento
- **Ganho** — marca como vendido
- **Perdido** — marca como perdido

O botão da situação atual fica destacado (Ganho em verde, Perdido em vermelho, Aberto em ciano). Os outros ficam apagados.

## Comportamento

- Clicar em **Ganho**: o lead é movido na hora para a coluna de ganho/vendas do funil e some da coluna anterior. Aviso: "Lead marcado como ganho".
- Clicar em **Perdido**: o lead vai para a coluna de perdido. Aviso: "Lead marcado como perdido".
- Clicar em **Aberto**: o lead volta para a primeira coluna que não é ganho nem perdido (hoje, "Novo"), só se ele estiver atualmente em ganho ou perdido. Se já estiver aberto, nada acontece.
- A mudança é gravada direto, sem precisar clicar em "Salvar alterações", e o quadro atrás do modal já reflete a nova coluna.
- O seletor "Etapa" na aba Dados continua funcionando e fica sincronizado com os botões.

## Casos especiais

- Se o funil não tiver nenhuma coluna marcada como ganho ou perdido, o botão correspondente fica desabilitado com a dica: "Nenhuma etapa de ganho/perda configurada — configure em Etapas".

## Detalhes técnicos

- `src/components/crm/LeadModal.tsx`: novo bloco de botões no `DialogHeader`, à esquerda do botão de fechar (com `pr` para não sobrepor). Deriva a situação atual comparando `lead.crm_stage_id` com as etapas que têm `is_won` / `is_lost`.
- Reutiliza `useMoveLead` de `src/hooks/useCrmLeads.ts` (`{ leadId, stageId, position: 0 }`), que já faz atualização otimista e invalida `crm-leads`.
- Ao mudar a situação, também atualiza o estado local do formulário (`crm_stage_id`) para o seletor "Etapa" refletir a escolha.
- Sem mudanças de banco de dados: as flags `is_won` e `is_lost` já existem em `crm_stages`.
