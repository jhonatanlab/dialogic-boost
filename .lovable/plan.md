# Permitir que gerentes salvem a configuração do Agente IA

## O que está acontecendo
O botão "Salvar" na página Agente IA guarda a chave de IA da empresa através de uma rotina protegida no banco. Essa rotina só aceita perfis "admin" e "owner" — o perfil de gerente é recusado com a mensagem "forbidden: insufficient role". É o mesmo bloqueio de perfil que já foi corrigido no menu, na página e no teste de chave, mas que continua na etapa de salvar.

## Correção
- Atualizar a rotina de salvamento da chave de IA para aceitar também o perfil de gerente, mantendo a exigência de pertencer à própria empresa.
- Manter o bloqueio para atendentes e para qualquer tentativa de salvar em empresa diferente.
- Verificar se as demais gravações da mesma tela (provedor, modelo, instruções do agente) também aceitam gerente e alinhar se necessário.

## Detalhes técnicos
- `public.set_company_llm_api_key(uuid, text)`: nova migração `CREATE OR REPLACE` incluindo `manager` na checagem de papel (`v_role NOT IN ('admin','owner','manager')`), mantendo `SECURITY DEFINER`, `SET search_path = public`, o `REVOKE`/`GRANT EXECUTE ... TO authenticated` e a validação `v_company = p_company_id`.
- Conferir as políticas RLS de `companies` para UPDATE dos campos `llm_provider` / `llm_model` e garantir que gerentes da própria empresa passem (usando `is_company_manager()` se preciso).
- Sem mudanças de layout; `src/pages/AgentAI.tsx` já exibe o motivo real do erro via `readFnError`.

## Validação
Entrar como gerente, colar a chave, clicar em Salvar e confirmar sucesso; depois "Testar chave" e "Testar agente".
