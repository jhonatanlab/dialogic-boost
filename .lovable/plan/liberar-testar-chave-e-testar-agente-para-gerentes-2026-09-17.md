# Liberar "Testar chave" e "Testar agente" para gerentes

## O que está acontecendo

A página Agente IA já abre para gerentes, mas a verificação usada pelos botões
"Testar chave" e "Testar agente" só aceita administradores. Quando um gerente
clica, o pedido é recusado antes de chegar ao provedor de IA, e a tela mostra
apenas "Edge Function returned a non-2xx status code".

Confirmado: o gerente pertence à empresa Raízes do Sertão Restaurante, que tem
chave de IA salva, provedor OpenAI e modelo gpt-4o-mini — ou seja, a
configuração está correta; o bloqueio é só de permissão.

## O que será feito

1. Passar a aceitar também o papel de gerente nos testes de IA, mantendo o
   bloqueio para atendentes.
2. Fazer a mensagem de erro chegar legível na tela: em vez do texto genérico,
   mostrar o motivo real (sem permissão, chave inválida, modelo inexistente etc.).
3. Validar com a conta de gerente: clicar em "Testar chave" e em "Testar agente"
   e conferir a resposta.

## Detalhes técnicos

- `supabase/functions/test-llm-connection/index.ts`: a checagem
  `["admin","owner"].includes(profile.role)` passa a incluir `manager`.
- Retornos de erro de permissão continuam 403, mas o front deixa de exibir o
  texto genérico: em `src/pages/AgentAI.tsx`, as mutações `testKeyMutation` e
  `previewMutation` passam a ler o corpo da resposta de erro
  (`error.context?.json?.()` / fallback para `error.message`) e mostram o campo
  `error` retornado pela função.
- Republicar apenas `test-llm-connection`.
- Sem mudanças de banco, de RLS ou de fluxo de mensagens em produção.
