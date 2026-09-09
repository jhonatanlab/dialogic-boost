# Propostas: painel inicial em vez de ir direto para Kits

Hoje, ao clicar em **Propostas** no menu, o sistema abre direto a tela de Kits. A ideia é abrir primeiro um painel do módulo, com atalhos para tudo que faz parte de propostas.

## Novo painel `/propostas`

- Título "Propostas" com uma breve descrição do módulo.
- Botão destacado **Configurações** no topo, que abre a área de cadastros/ajustes (`/propostas/configuracoes`).
- Cartões de atalho, cada um com ícone, nome e uma linha de explicação:
  - Kits
  - Inversores
  - Módulos
  - Concessionárias, cidades, telhados, orientações e tipos de ligação (leva às abas de Configurações)
  - Financiamento
  - Valores fixos
  - Personalização
- Cada cartão mostra a quantidade de registros cadastrados da empresa, para dar uma visão rápida do que já está preenchido.
- Espaço reservado, com aviso "em breve", para a listagem de propostas geradas (o cálculo já existe, mas nada é salvo ainda).

## Navegação

- O item **Propostas** do menu lateral passa a apontar para `/propostas`.
- `/propostas` deixa de redirecionar para `/propostas/kits` e passa a exibir o painel.
- As páginas atuais continuam funcionando nos mesmos endereços; ganham um link de voltar para o painel.

## Detalhes técnicos

- Nova página `src/pages/propostas/Overview.tsx` usando `DashboardLayout` e os cartões do design system (tokens de cor atuais, cards 12px).
- Contagens via `useSolarCatalog` (React Query) para `solar_inverters`, `solar_modules`, `solar_kits` e demais catálogos; hooks existentes `useSolarPricingConfig` e `useSolarBranding` para indicar se já estão configurados.
- `src/App.tsx`: `/propostas` passa a renderizar `Overview` (remove o `Navigate`).
- `src/components/layout/AppSidebar.tsx`: url do item Propostas passa a `/propostas` (mesmas permissões admin/manager).
- Sem mudanças de banco de dados nem de lógica de cálculo.
