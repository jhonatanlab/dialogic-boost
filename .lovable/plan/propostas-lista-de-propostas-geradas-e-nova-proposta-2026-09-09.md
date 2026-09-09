# Propostas: lista de propostas geradas e nova proposta

O painel `/propostas` passa a ser a lista das propostas da empresa. Os atalhos de cadastros saem do painel e ficam dentro de **Configurações**, visível apenas para administradores e gerentes.

## Painel `/propostas` (todos os usuários da empresa)

- Botão **Nova proposta**.
- Botão **Configurações** apenas para admin/gerente.
- Tabela de propostas geradas com: cliente, cidade, kit, potência (kWp), consumo médio, valor à vista, data e responsável.
- Busca por cliente e filtro por situação (rascunho, enviada, aceita, recusada).
- Ações por linha: abrir, alterar situação e excluir (excluir só para admin/gerente ou autor).
- Se ainda não houver propostas, mensagem convidando a gerar a primeira.

## Página de Configurações de Propostas

`/propostas/configuracoes` recebe, no topo, os cartões de atalho que hoje estão no painel: Kits, Inversores, Módulos, Financiamento, Valores fixos, Personalização — além das abas de cadastros de apoio que já existem. Atendentes que tentarem abrir essa área veem um aviso de acesso restrito.

## Nova proposta `/propostas/nova`

Formulário em uma página, com resultado ao lado/abaixo:

1. Cliente: escolher um contato existente ou digitar nome e telefone.
2. Dados técnicos: kit, cidade, tipo de telhado, orientação, tipo de ligação, concessionária, consumo médio mensal (kWh), distância (km) e banco de financiamento (opcional).
3. Botão **Calcular**: chama o cálculo já existente e mostra geração mês a mês, cobertura do consumo, valor à vista, economia do 1º ano, payback, retorno em 25 anos e parcelas de financiamento.
4. Botão **Salvar proposta**: grava a proposta com os dados escolhidos e o resultado completo, e volta para a lista.

Ao abrir uma proposta salva, os mesmos dados e resultados são exibidos, com opção de recalcular e salvar novamente.

## Regras de acesso

- Qualquer usuário da empresa pode ver a lista, criar e editar as propostas da própria empresa.
- Apenas administradores e gerentes acessam Configurações e os cadastros (kits, equipamentos, financiamento, valores fixos, personalização) — comportamento que já vale hoje para escrita.

## Detalhes técnicos

Banco (migração):

- Nova tabela `public.solar_proposals`: `id uuid pk`, `company_id uuid not null references companies(id) on delete cascade`, `created_by uuid` (auth user id, sem FK), `contact_id uuid references contacts(id) on delete set null`, `client_name text not null`, `client_phone text`, `kit_id`, `city_id`, `roof_type_id`, `orientation_id`, `connection_type_id`, `utility_id` (todos `uuid` com FK `on delete set null` nas tabelas solares), `avg_monthly_consumption_kwh numeric not null`, `distance_km numeric not null default 0`, `financing_bank_id uuid references solar_financing_banks(id) on delete set null`, `status text not null default 'draft'` com check em (`draft`,`sent`,`accepted`,`rejected`), `kwp_total numeric`, `cash_price numeric`, `payback_months integer`, `result jsonb not null default '{}'::jsonb`, `created_at`/`updated_at` + trigger `update_updated_at_column`.
- Grants: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.solar_proposals TO authenticated; GRANT ALL ... TO service_role;` (sem `anon`).
- RLS habilitada com políticas por `company_id = public.get_user_company_id()`: leitura/criação/edição para qualquer usuário autenticado da empresa; exclusão para `public.is_company_manager()` ou `created_by = auth.uid()`.
- Índices em `company_id` e `(company_id, created_at desc)`.

Frontend:

- Novo hook `src/hooks/useSolarProposals.ts` (React Query): listar, obter por id, salvar (insert/update), atualizar situação, excluir, invalidando `["solar_proposals", companyId]`.
- `src/pages/propostas/Overview.tsx` reescrita: tabela de propostas + botões Nova proposta e Configurações (este condicionado a `profile.role` em `admin`/`manager` via `useCompany`).
- Nova página `src/pages/propostas/NewProposal.tsx` (rota `/propostas/nova` e `/propostas/:id`), usando `useSolarCatalog` para os selects e `useContacts` para o cliente; chamada ao cálculo com `supabase.functions.invoke("calculate-solar-proposal", ...)` e persistência do JSON retornado em `result`.
- `src/pages/propostas/Settings.tsx`: adiciona a grade de cartões de atalho (Kits, Inversores, Módulos, Financiamento, Valores fixos, Personalização) acima das abas e um bloqueio simples de acesso para papéis diferentes de admin/manager.
- `src/App.tsx`: novas rotas `/propostas/nova` e `/propostas/:id`.
- Sem alteração na edge function `calculate-solar-proposal` (continua só calculando); a persistência acontece pelo frontend com RLS por empresa.
