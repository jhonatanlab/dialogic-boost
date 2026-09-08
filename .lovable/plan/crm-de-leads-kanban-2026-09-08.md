# CRM de Leads (Kanban)

Nova página **CRM** no menu lateral, ao lado de Contatos (que continua como está).

## Visão Kanban

- Colunas = etapas do funil, criadas e gerenciadas por você: adicionar, renomear, mudar cor, reordenar e arquivar etapas.
- Cada lead aparece como um card (nome, telefone, responsável, etiquetas, valor de origem) e pode ser arrastado entre etapas.
- Etapas iniciais sugeridas: Novo, Em contato, Qualificado, Proposta, Ganho, Perdido — todas editáveis.
- Busca por nome/telefone/e-mail e filtros por responsável, origem e etiqueta.
- Contador de leads por etapa no topo de cada coluna.
- Botão "Novo lead" cria o contato já na etapa escolhida.
- Todo lead existente sem etapa entra automaticamente na primeira etapa.

## Modal do lead

Abre ao clicar no card, com abas:

1. **Dados** — Nome, e-mail, telefone, telefone secundário, responsável, pré-vendedor, vendedor (escolhidos entre os atendentes da empresa), origem, indicado por, data de criação (só leitura), etiquetas e etapa atual.
2. **Documentos** — CPF/CNPJ, RG/CNH, data de nascimento, profissão, sexo.
3. **Endereço** — CEP, rua, número, complemento, bairro, cidade, estado.
4. **Arquivos** — anexar, baixar e excluir arquivos do lead (documentos, propostas, fotos).
5. **Conversa** — histórico das mensagens de WhatsApp do contato, somente leitura, com botão "Abrir no Inbox" para responder.
6. **Anotações** — reaproveita as anotações que já existem no contato.

Edição direto no modal, salvando por aba. Máscaras em telefone, CPF/CNPJ e CEP; validação de CPF/CNPJ.

## Detalhes técnicos

- Novas colunas em `contacts`: `phone_secondary`, `owner_user_id`, `pre_sales_user_id`, `sales_user_id`, `referred_by`, `cpf_cnpj`, `rg_cnh`, `profession`, `gender`, `address_zip`, `address_street`, `address_number`, `address_complement`, `address_district`, `address_city`, `address_state`, `crm_stage_id`, `crm_position`. Campos de origem, nome, e-mail, telefone, aniversário e data de criação já existem.
- Nova tabela `crm_stages` (`company_id`, `name`, `color`, `sort_order`, `is_won`, `is_lost`) com GRANTs e RLS por `company_id`; leitura para toda a empresa, escrita para admin/manager.
- Nova tabela `contact_files` (`contact_id`, `company_id`, `file_name`, `file_path`, `mime_type`, `size`, `uploaded_by`) + bucket privado `contact-files` com políticas de leitura/escrita restritas à empresa; URLs assinadas na exibição, reutilizando o padrão de `src/lib/mediaSrc.ts`.
- Novos hooks: `useCrmStages.ts`, `useContactFiles.ts`; `useContacts.ts` estendido com os novos campos, movimentação de etapa (atualização otimista) e lista de atendentes da empresa para os seletores.
- Novos arquivos: `src/pages/CRM.tsx`, `src/components/crm/KanbanBoard.tsx`, `KanbanColumn.tsx`, `LeadCard.tsx`, `StageManagerDialog.tsx`, `LeadModal.tsx` e as abas em `src/components/crm/tabs/`.
- Rota `/crm` em `src/App.tsx` e item "CRM" em `AppSidebar.tsx`.
- Drag and drop com `@dnd-kit` (leve e acessível); a aba Conversa reaproveita os hooks de mensagens existentes em modo leitura.
- Tokens visuais atuais (ciano/navy, cards 12px) mantidos; sem cores fixas em componentes.

## Fora do escopo

- Enviar mensagem de dentro do modal (apenas leitura + atalho para o Inbox).
- Campos personalizados novos além dos listados.
