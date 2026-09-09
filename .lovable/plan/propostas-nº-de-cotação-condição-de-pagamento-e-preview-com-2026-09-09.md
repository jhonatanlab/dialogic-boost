# Propostas: nº de cotação, condição de pagamento e preview com gráfico

A tabela de propostas e as páginas `/propostas` e `/propostas/nova` já existem (criadas no passo anterior). Em vez de recriar tudo, esta etapa completa o que falta: numeração de cotação por empresa, vendedor, validade, condição de pagamento, link do PDF, data de envio, e um preview mais completo antes de salvar.

## Banco de dados

Na tabela de propostas já existente, acrescentar:

- **nº da cotação** — numeração sequencial e independente por empresa (a primeira proposta da empresa é a 1, a seguinte a 2, e assim por diante), preenchida automaticamente ao salvar.
- **vendedor responsável** — usuário que criou/assinou a proposta.
- **validade** — data até quando a proposta vale.
- **condição de pagamento** — texto escolhido no formulário (à vista ou financiamento em X meses).
- **link do PDF** — campo reservado para a geração de PDF em etapa futura.
- **data de envio** — preenchida quando a situação muda para "Enviada".
- **cidade do cliente** — o campo de cidade atual passa a atender esse papel (nenhuma coluna nova).

As regras de acesso permanecem as mesmas: cada empresa vê e edita apenas as próprias propostas; exclusão para administradores, gerentes ou o autor.

## Página `/propostas/nova`

Mantém o formulário atual (contato do CRM ou nome avulso, cidade, kit, telhado, orientação, tipo de ligação, concessionária, consumo médio, distância em km) e ganha:

- **Condição de pagamento**: à vista, ou financiamento com banco e prazo (as parcelas vêm do cálculo).
- **Validade da proposta**: data, sugerida em 15 dias à frente.
- **Preview após Calcular**:
  - gráfico de barras da geração mensal (12 meses) em kWh;
  - cartões com valor à vista, economia no 1º ano e payback;
  - tabela de parcelas de financiamento (banco, prazo, parcela, total pago, juros);
  - resumo de cobertura do consumo e retorno em 25 anos.
- **Salvar proposta** grava com situação "Rascunho", guardando o resultado completo do cálculo, a condição de pagamento escolhida, a validade, o vendedor e o nº da cotação.

## Página `/propostas` (listagem)

Colunas passam a ser: **nº cotação, cliente, kWp, valor, situação, data, ações** (abrir, alterar situação, excluir). Busca por cliente e por nº de cotação, e filtro por situação continuam disponíveis. Ao mudar a situação para "Enviada", a data de envio é registrada.

## Detalhes técnicos

- Migração: `ALTER TABLE public.solar_proposals` adicionando `quote_number integer`, `seller_user_id uuid`, `valid_until date`, `payment_condition text`, `pdf_url text`, `sent_at timestamptz`; índice único `(company_id, quote_number)`; trigger `BEFORE INSERT` que calcula `coalesce(max(quote_number),0)+1` para a empresa (com `SET search_path = public`, security definer não necessário pois a RLS já limita à empresa — usar `security definer` só se o `max` precisar ignorar RLS; será definer para garantir a sequência correta). Backfill dos registros existentes por `created_at`.
- Sem alteração na edge function `calculate-solar-proposal`.
- `src/hooks/useSolarProposals.ts`: incluir os novos campos no tipo `SolarProposal`, aceitar `payment_condition`, `valid_until`, `seller_user_id` no salvar, e definir `sent_at` ao mudar a situação para `sent`.
- `src/pages/propostas/NewProposal.tsx`: novos campos de condição de pagamento e validade; preview com `recharts` (`BarChart` já usado em Analytics) para geração mensal, cartões de resumo e `Table` de parcelas.
- `src/pages/propostas/Overview.tsx`: coluna `quote_number` como primeira, remover colunas de cidade/kit/consumo para chegar ao conjunto pedido, e busca também por número.
- Nenhuma mudança nas páginas de configurações/cadastros.
