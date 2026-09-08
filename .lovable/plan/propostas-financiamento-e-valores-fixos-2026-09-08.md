# Propostas — Financiamento e Valores fixos

Adicionar dois novos cadastros ao módulo Propostas, seguindo o mesmo padrão das telas já criadas. Nenhum cálculo de proposta nesta etapa.

## Financiamento (`/propostas/configuracoes/financiamento`)

- Lista de **bancos**: nome, descrição, status ativo/inativo, ações editar/excluir.
- Ao selecionar um banco, lista os **prazos** dele: prazo em meses, taxa de juros mensal (%), status ativo/inativo, ações editar/excluir.
- Um banco só pode ter um registro por prazo (evita duplicidade de 60x, por exemplo).

## Valores fixos (`/propostas/configuracoes/valores-fixos`)

Formulário único por empresa (uma linha por empresa, criada na primeira gravação):

- Margem (%)
- Preço por km deslocamento (R$)
- Taxa base de visita (R$)
- Inflação anual da tarifa (%)
- Degradação anual do módulo (%)

Salvar com botão "Salvar alterações"; ao abrir, os valores atuais já aparecem preenchidos.

## Navegação

As duas telas entram como abas adicionais em Configurações de Propostas — "Financiamento" e "Valores fixos" — ao lado de Concessionárias, Cidades, Telhados, Orientações e Tipos de ligação, e também respondem nas rotas próprias acima.

## Regras de acesso

Cada empresa vê apenas seus próprios dados. Administradores e gerentes podem criar, editar e excluir; atendentes apenas visualizar.

## Detalhes técnicos

Migração:

- `solar_financing_banks`: `id`, `company_id uuid not null references public.companies(id) on delete cascade`, `name text not null`, `description text`, `is_active boolean not null default true`, `created_at`/`updated_at` + trigger `update_updated_at_column`.
- `solar_financing_terms`: `id`, `company_id` (FK companies), `bank_id uuid not null references public.solar_financing_banks(id) on delete cascade`, `term_months integer not null`, `monthly_interest_rate numeric`, `is_active boolean not null default true`, timestamps + trigger, `unique (bank_id, term_months)`.
- `solar_pricing_config`: `id`, `company_id uuid not null unique references public.companies(id) on delete cascade`, `margin_percent numeric`, `price_per_km numeric`, `base_visit_fee numeric`, `annual_tariff_inflation_percent numeric`, `annual_module_degradation_percent numeric`, timestamps + trigger.
- Para as três: `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`, `GRANT ALL ... TO service_role`, `ENABLE ROW LEVEL SECURITY`, leitura com `company_id = public.get_user_company_id()` e escrita adicionando `public.is_company_manager()`. Índices por `company_id` e por `bank_id`.

Frontend:

- Reaproveitar `useSolarCatalog`/`useSaveSolarItem`/`useDeleteSolarItem` (estendendo o tipo `SolarTable`) e o componente `CatalogManager` para bancos; para prazos, uma tabela filtrada por `bank_id` usando os mesmos hooks com filtro no cliente e `bank_id` injetado no formulário.
- Novo hook `useSolarPricingConfig` (leitura + upsert por `company_id`) e página de formulário simples com `Card` + inputs numéricos.
- Novas páginas em `src/pages/propostas/Financing.tsx` e `src/pages/propostas/FixedValues.tsx`; rotas em `src/App.tsx`; abas adicionais em `src/pages/propostas/Settings.tsx`.
