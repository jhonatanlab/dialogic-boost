# Módulo Propostas — Cadastros base (somente CRUD)

Criar a base de cadastros para futuras propostas solares: tabelas no banco e telas simples de cadastro, sem nenhum cálculo de proposta ainda (exceto o kWp do kit, que é somado automaticamente).

## Novo menu

Novo item **Propostas** no menu lateral (visível para admin e gerente), com as páginas:

- `/propostas/inversores`
- `/propostas/modulos`
- `/propostas/kits`
- `/propostas/configuracoes` — abas: Concessionárias, Cidades, Telhados, Orientações, Tipos de ligação

Cada tela segue o mesmo padrão do painel de referência: lista com nome, descrição, preço, status ativo/inativo e ações de editar/excluir, com botão para adicionar novo registro em um modal.

## Dados por cadastro

- **Inversores**: nome, marca, modelo, potência (kW), número de MPPTs, entradas, fases, eficiência, descrição, preço, ativo.
- **Módulos**: nome, marca, modelo, potência (Wp), tecnologia, largura, altura, peso, descrição, preço, ativo.
- **Kits**: nome, inversor, módulo, quantidade de módulos, kWp total (calculado = potência do módulo x quantidade / 1000, somente leitura), descrição, preço, ativo.
- **Concessionárias**: nome, estado, tarifa (R$/kWh), taxa mínima, descrição, preço, ativo.
- **Cidades**: nome, estado, latitude, longitude, irradiação mês a mês (janeiro a dezembro), descrição, ativo.
- **Telhados**: nome, fator de perda, descrição, preço, ativo.
- **Orientações**: nome, azimute, fator de perda, descrição, ativo.
- **Tipos de ligação**: nome, fases, tensão, taxa mínima em kWh, descrição, ativo.

## Regras de acesso

Todo registro pertence a uma empresa. Cada usuário vê, cria, edita e exclui apenas os registros da própria empresa; administradores e gerentes podem gerenciar, atendentes apenas visualizar.

## Detalhes técnicos

- Migração criando: `solar_inverters`, `solar_modules`, `solar_kits`, `solar_utilities`, `solar_cities` (com `irradiance_jan`..`irradiance_dez numeric`), `solar_roof_types`, `solar_orientations`, `solar_connection_types`.
- Todas com `id uuid pk`, `company_id uuid not null references public.companies(id) on delete cascade`, `name text not null`, `description text`, `price numeric default 0`, `is_active boolean not null default true`, `created_at`/`updated_at` + trigger `update_updated_at_column`.
- `solar_kits`: `inverter_id -> solar_inverters`, `module_id -> solar_modules`, `module_quantity int not null default 1`, `kwp_total numeric` gravado pelo frontend a partir da potência do módulo.
- Para cada tabela: `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`, `GRANT ALL ... TO service_role`, `ENABLE ROW LEVEL SECURITY` e políticas usando `company_id = public.get_user_company_id()` (leitura para qualquer usuário da empresa; escrita restrita a `admin`/`manager` via `profiles.role`).
- Índices por `company_id` em todas as tabelas.
- Frontend: um hook genérico `useSolarCatalog(table)` (React Query) reutilizado por todas as telas, componente compartilhado `CatalogTable` + `CatalogFormDialog` com campos declarados por configuração, e páginas em `src/pages/propostas/`.
- Rotas adicionadas em `src/App.tsx`; item de menu em `src/components/layout/AppSidebar.tsx`.
- Nenhuma lógica de cálculo de proposta, geração ou dimensionamento nesta etapa.
