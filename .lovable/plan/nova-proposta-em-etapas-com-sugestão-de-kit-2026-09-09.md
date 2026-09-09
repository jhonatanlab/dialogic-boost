# Nova proposta em etapas com sugestão de kit

Transformar a tela de nova proposta em um passo a passo, deixando a escolha do kit para depois do consumo e dos dados técnicos — e com o sistema indicando quais kits atendem à geração necessária.

## Como fica o fluxo

**Etapa 1 — Cliente**
Contato do CRM (ou nome avulso), nome e telefone.

**Etapa 2 — Consumo e local**
Consumo médio mensal (kWh), cidade, tipo de telhado, orientação, tipo de ligação, concessionária e distância em km.

**Etapa 3 — Escolha do kit**
Acima da tabela, um resumo do que é necessário:
- geração mensal necessária (kWh/mês) e anual;
- potência necessária (kWp) para atingir 100% do consumo, já considerando a irradiação da cidade e as perdas do telhado e da orientação escolhidos.

Abaixo, a lista de **todos os kits ativos**, ordenada do mais adequado ao menos adequado (menor diferença entre a geração estimada do kit e a geração necessária). Os **3 primeiros recebem a marcação "Sugestão"**. Colunas: kit, potência (kWp), geração média estimada (kWh/mês), cobertura do consumo (%), valor do kit e um botão Selecionar. O vendedor pode escolher qualquer kit da lista, inclusive fora das sugestões.

**Etapa 4 — Condições e resultado**
Banco de financiamento, condição de pagamento (à vista ou financiamento com prazo), validade, botão Calcular e, depois do cálculo, o resumo, gráfico de geração, tabela de parcelas, além de Salvar proposta e Imprimir / Salvar PDF (comportamento atual mantido).

## Regras

- Navegação com "Voltar" e "Continuar"; cada etapa só libera a seguinte quando os campos obrigatórios estão preenchidos. As etapas concluídas ficam clicáveis para revisão.
- Trocar consumo, cidade, telhado ou orientação recalcula as sugestões e limpa o resultado já calculado (para não exibir números desatualizados).
- Ao abrir uma proposta já salva, todas as etapas aparecem liberadas com os dados preenchidos.
- Meta de cobertura fixa em 100% do consumo.

## Detalhes técnicos

- Somente frontend: `src/pages/propostas/NewProposal.tsx` passa a ter um estado `step` (1..4) e o formulário é dividido em blocos por etapa; um indicador de etapas fica no topo. Sem alteração de banco de dados nem de edge function.
- A estimativa por kit é calculada no cliente, com a mesma matemática da função de cálculo, num helper novo `src/lib/solarEstimate.ts`:
  - irradiação média diária da cidade = média dos 12 campos `irradiance_*`;
  - fatores de perda: telhado e orientação (`loss_factor` em %) aplicados de forma multiplicativa, mais a perda fixa de sistema de 20% usada pela função `calculate-solar-proposal`;
  - geração mensal estimada = kWp × irradiação média × 30,4 × fatores de perda;
  - potência necessária = consumo mensal ÷ (irradiação média × 30,4 × fatores de perda);
  - kWp do kit vem de `kwp_total`, com fallback para potência do módulo × quantidade ÷ 1000.
- As sugestões são apenas orientação de tela; os números oficiais da proposta continuam vindo da edge function `calculate-solar-proposal` no passo Calcular, sem alteração de contrato.
- Kits inativos são omitidos da lista; se a cidade não tiver irradiação cadastrada, a tabela mostra um aviso e permite escolher o kit manualmente.
