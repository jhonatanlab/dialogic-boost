
Objetivo: corrigir o envio real da automação pelo webhook de Enviar Mensagem.

Diagnóstico confirmado
- A automação está sendo acionada corretamente.
- O webhook de entrada encontrou a palavra-chave e chamou `execute-automation`.
- O `execute-automation` executou o nó de mensagem e inseriu a mensagem no banco, por isso ela apareceu no chat.
- A falha acontece só na etapa de envio externo: o log atual mostra `n8n_send_message endpoint not found for company`.
- Causa raiz: `execute-automation` busca `admin_settings` com filtro por `company_id`, mas o salvamento das configurações administrativas hoje grava apenas `user_id`, `setting_key` e `setting_value`. Ou seja, muitos registros ficam com `company_id = null`.
- Por isso chat/campanhas podem funcionar em alguns fluxos, mas a automação falha: outros trechos consultam `admin_settings` sem esse filtro ou com fallback; o `execute-automation` não.

Plano de correção

1. Corrigir a resolução do endpoint no backend
- Ajustar `supabase/functions/execute-automation/index.ts` para resolver `n8n_send_message` em camadas:
  1. buscar por `company_id`
  2. se não encontrar, buscar pelo `user_id` dono da empresa
  3. como último fallback, buscar sem filtro estrito
- Registrar no log qual origem foi usada para facilitar debug futuro.

2. Alinhar o salvamento das configurações administrativas
- Ajustar `src/hooks/useAdminSettings.ts` para salvar também `company_id` junto com cada `admin_settings`.
- Assim novos registros ficam compatíveis com os backends que consultam por empresa.

3. Corrigir dados já existentes
- Criar uma migração para preencher `admin_settings.company_id` com base no relacionamento do usuário em `profiles`.
- Isso evita que o problema continue para configurações já salvas antes da correção.

4. Fortalecer a observabilidade do envio
- Em `execute-automation`, adicionar logs explícitos para:
  - endpoint resolvido
  - ausência de instância
  - telefone final usado
  - status HTTP da chamada de envio
  - corpo de erro resumido quando o webhook responder falha
- Isso elimina o “silêncio” atual quando o fluxo executa mas não entrega.

5. Validar o fluxo real ponta a ponta
- Testar novamente com a palavra-chave.
- Confirmar:
  - webhook inbound detecta o gatilho
  - `execute-automation` resolve o endpoint
  - chamada ao webhook de envio é feita
  - mensagem chega no WhatsApp
  - mensagem continua aparecendo no chat
  - callbacks posteriores continuam atualizando status normalmente.

Arquivos impactados
- `supabase/functions/execute-automation/index.ts`
- `src/hooks/useAdminSettings.ts`
- migração SQL para `admin_settings`

Detalhe técnico importante
- O problema agora não é mais o gatilho da automação.
- O gatilho já está funcionando; o bloqueio atual é exclusivamente a resolução do endpoint de envio no backend.
- A correção ideal é combinar:
  - tolerância a dados antigos no `execute-automation`
  - consistência no salvamento futuro
  - backfill dos registros antigos.
