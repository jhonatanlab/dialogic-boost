# Corrigir "Erro ao salvar: forbidden: company mismatch" (VZaps)

## O que está acontecendo (confirmado)

A conexão VZaps foi criada por você, na tela Admin SaaS, para a empresa **DLS ENERGIA SOLAR**. Você, porém, pertence à empresa **ELOHUB**.

A regra de segurança que salva o ID e o token da conexão exige que a empresa do usuário seja a mesma empresa da conexão. Como você administra a plataforma e está configurando a conexão de outra empresa, a regra recusa o salvamento com a mensagem "forbidden: company mismatch".

O mesmo bloqueio acontece nos botões "Testar" e "Ativar recebimento", que usam a mesma checagem.

## O que será feito

Permitir que o administrador que criou a conexão configure-a mesmo quando ela pertence a outra empresa, mantendo o bloqueio para todos os demais casos:

1. Liberar o salvamento quando a empresa coincidir **ou** quando quem chama for o dono do registro da conexão e tiver papel de administrador.
2. Aplicar a mesma regra às três formas de conexão (VZaps, Zapster, Evolution), para não repetir o problema depois.
3. Aplicar a mesma regra nas ações de "Testar" e "Ativar recebimento" das três conexões.
4. Validar com a conexão VZaps da DLS: salvar ID + token, testar e ativar o recebimento.

Nada muda para quem administra a própria empresa; ninguém passa a ver ou editar conexões de empresas que não criou.

## Detalhes técnicos

- Funções de banco `save_instance_vzaps_config`, `save_instance_zapster_config`, `save_instance_evolution_config` (e `set_instance_evolution_api_key`, se usar a mesma checagem): trocar
  `v_user_company = v_inst_company AND has_role(admin)`
  por
  `(v_user_company = v_inst_company OR v_owner = auth.uid()) AND has_role(auth.uid(),'admin')`,
  onde `v_owner` é `whatsapp_instances.user_id`. Migração via `CREATE OR REPLACE FUNCTION`, mantendo `SECURITY DEFINER`, `SET search_path = public` e os GRANTs atuais.
- Edge functions `test-vzaps-connection`, `test-zapster-connection`, `test-evolution-connection`: a checagem `profile.company_id !== inst.company_id` passa a aceitar também `inst.user_id === userId`; caso contrário continua retornando 403.
- Republicar apenas as edge functions alteradas.
