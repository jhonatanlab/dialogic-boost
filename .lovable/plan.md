# Deixar a página Agente IA abrir para gerentes

## Por que ela não abre

A própria página Agente IA tem uma segunda checagem de permissão, separada do menu: ela só aceita os perfis "admin" e "owner" (perfil que não existe no sistema). Como seu acesso na DLS é de gerente, a página redireciona de volta para o painel logo ao carregar.

## O que muda

- A página passa a aceitar administradores e gerentes, igual à regra já aplicada no menu.
- O perfil inexistente "owner" sai da regra.
- Atendentes continuam sendo redirecionados para o painel.

## Detalhes técnicos

- `src/pages/AgentAI.tsx`, linha 67: `isAllowed` passa a ser `profile?.role === "admin" || profile?.role === "manager"`.
- O redirecionamento no `useEffect` e o `enabled` das consultas continuam iguais, apenas passam a valer com a nova regra.
