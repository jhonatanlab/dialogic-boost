# Liberar o "Agente IA" no menu para gerentes

## Por que não aparece

O item "Agente IA" do menu está configurado para dois perfis: "admin" e "owner". O perfil "owner" não existe no sistema (os perfis são admin, manager e agent), então na prática só administradores veem o item.

Seu acesso na DLS Energia Solar é de gerente (manager), por isso o item fica escondido. Na ELOHUB, onde você é administrador, ele aparece.

## O que muda

- "Agente IA" passa a aparecer para administradores e gerentes, igual a Automações, Campanhas, Relatórios, Propostas e Configurações.
- O perfil inexistente "owner" é removido da regra.
- Atendentes continuam sem ver o item.

## Detalhes técnicos

- `src/components/layout/AppSidebar.tsx`, linha 39: trocar `requiredRoles: ["admin", "owner"]` por `requiredRoles: ["admin", "manager"]`.
- A rota `/agent-ai` em `src/App.tsx` já existe e não muda.
