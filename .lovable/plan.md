# Edge Function `calculate-solar-proposal` (modo preview)

Cálculo completo de uma proposta solar a partir dos cadastros já existentes. Nada é gravado no banco: a função apenas recebe os dados, calcula e devolve o resultado em JSON.

## Entrada

```json
{
  "kit_id": "uuid",
  "city_id": "uuid",
  "roof_type_id": "uuid",
  "orientation_id": "uuid",
  "connection_type_id": "uuid",
  "utility_id": "uuid",
  "avg_monthly_consumption_kwh": 850,
  "distance_km": 42,
  "financing_bank_id": "uuid (opcional)"
}
```

Validação com Zod; campos obrigatórios faltando ou registros de outra empresa retornam erro 400/404.

## O que a função calcula

1. **Geração mensal (12 meses)**
   `geração_mês = irradiância_do_mês × kWp_do_kit × dias_do_mês × (1 - perda_do_telhado) × (1 - perda_da_orientação)`
   Retorna os 12 valores, o total anual e a média mensal.

2. **Cobertura do consumo**
   Compara a geração média com o consumo informado e com o consumo mínimo do tipo de ligação (a parcela mínima da concessionária sempre continua sendo paga).

3. **Economia ano a ano (25 anos)**
   Para cada ano: tarifa reajustada pela inflação tarifária configurada, geração reduzida pela degradação anual dos módulos, cobrança do Fio B sobre a energia injetada segundo o cronograma da Lei 14.300, taxa mínima da ligação, economia líquida do ano e economia acumulada.

4. **Payback e ROI**
   Mês/ano em que a economia acumulada supera o investimento, mais o ROI acumulado em 25 anos.

5. **Valor à vista**
   `custo = preço do kit + preço por km × distância + taxa base de visita`, depois `valor final = custo / (1 - margem%)`. Retorna o detalhamento de cada parcela do custo.

6. **Financiamento**
   Para cada prazo ativo (do banco informado, ou de todos os bancos quando nenhum é enviado): parcela pela Tabela Price, total pago e total de juros.

## Saída

JSON estruturado com as seções: `input_resolved` (nomes dos cadastros escolhidos), `generation`, `savings_years`, `summary` (payback, ROI, economia total), `pricing` e `financing`.

## Premissas (ajustáveis)

- **Fator de perda**: os campos `loss_factor` de telhado e orientação estão em porcentagem (ex.: `2.00` = 2% de perda) e são aplicados de forma multiplicativa. Uma perda fixa de sistema de 20% (cabeamento, sujidade, temperatura, inversor) entra por cima, seguindo a prática de mercado.
- **Fio B**: cronograma da Lei 14.300 — 2023: 15%, 2024: 30%, 2025: 45%, 2026: 60%, 2027: 75%, 2028: 90%, 2029 em diante: 100% da TUSD Fio B, estimada em 28% da tarifa cheia da concessionária. Esses percentuais ficam como constantes nomeadas na função, fáceis de trocar depois por um cadastro.
- **Irradiância** em kWh/m²·dia, convertida para geração mensal pelos dias reais de cada mês.

## Detalhes técnicos

- `supabase/functions/calculate-solar-proposal/index.ts`, com CORS, validação Zod e `verify_jwt = false` (validação do JWT em código).
- Autentica o usuário pelo token enviado, resolve o `company_id` pelo perfil e usa o service role apenas para ler os cadastros, sempre filtrando por esse `company_id` — nenhum acesso a dados de outra empresa.
- Leituras: `solar_kits` (com inversor e módulo), `solar_cities`, `solar_roof_types`, `solar_orientations`, `solar_connection_types`, `solar_utilities`, `solar_pricing_config`, `solar_financing_banks` e `solar_financing_terms`.
- Toda a matemática fica em `calc.ts` dentro da pasta da função (geração, fluxo de 25 anos, payback, Price), separada do handler HTTP.
- Sem escrita no banco e sem tabela de propostas nesta etapa; a persistência entra em um passo seguinte.
- Nenhuma alteração de banco de dados é necessária.
- Teste após o deploy chamando a função com um kit e uma cidade reais da DLS Energia Solar.
