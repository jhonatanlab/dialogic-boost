# Fixar rodapé do modal de lead

## O que muda

No modal da ficha do lead (`src/components/crm/LeadModal.tsx`), o rodapé com os botões **Fechar** e **Salvar alterações** fica fixo na parte inferior. Apenas o conteúdo entre o cabeçalho e o rodapé rola.

## Comportamento

- O cabeçalho com avatar, nome e botões Aberto/Ganho/Perdido continua visível no topo.
- O rodapé com os botões de ação fica sempre visível na base do modal.
- As abas (Dados, Documentos, Endereço, Arquivos, Conversa, Anotações) e seus respectivos formulários rolam dentro de uma área intermediária, sem empurrar os botões para fora da tela.
- Em telas menores, o modal continua respeitando `max-h-[90vh]` e a rolagem interna funciona.

## Detalhes técnicos

- `src/components/crm/LeadModal.tsx`:
  - Transformar `DialogContent` em container flex (`flex flex-col`).
  - Envolver as `Tabs` em uma `div` com `flex-1 overflow-y-auto` e `min-h-0`, mantendo o `TabsList` e os `TabsContent` dentro.
  - Manter o rodapé com botões fora dessa área rolável, já posicionado após as abas.
  - Garantir que o `DialogHeader` e o rodapé não encolham (`shrink-0`).
- Sem mudanças de banco de dados ou estado de dados.
- Verificação: abrir um lead no `/crm`, rolar o conteúdo e confirmar que os botões **Fechar** e **Salvar alterações** permanecem visíveis.
