# Personalização das Propostas (marca da empresa)

Nova área em Propostas > Configurações para a empresa definir a identidade visual e os textos institucionais que serão usados nas propostas.

## O que o usuário verá

Nova aba **Personalização** (também acessível em `/propostas/configuracoes/personalizacao`) com:

- **Logo da empresa**: upload de imagem com pré-visualização e opção de trocar/remover.
- **Imagem de capa**: upload da imagem de fundo usada na capa da proposta.
- **Cores**: cor principal e cor secundária, escolhidas por seletor de cor com o código também editável em texto.
- **Rodapé**: texto livre do rodapé e uma lista de contatos (rótulo + valor, ex.: "WhatsApp — (63) 9xxxx-xxxx), podendo adicionar e remover linhas.
- **Textos institucionais**: Sobre nós, Missão, Visão e Valores.
- Um único botão **Salvar**; existe apenas um registro por empresa. Somente administradores e gerentes podem editar; os demais visualizam.

Nada de cálculo ou geração de proposta nesta etapa — apenas o cadastro.

## Banco de dados

Tabela `solar_branding`, um registro por empresa:

- `company_id` (único, referencia `companies`)
- `logo_url`, `cover_background_url` (texto)
- `primary_color`, `secondary_color` (texto)
- `footer_text`, `about_us_text`, `mission_text`, `vision_text`, `values_text` (texto)
- `footer_contacts` (jsonb, lista de `{ label, value }`, padrão `[]`)
- `created_at` / `updated_at` com gatilho de atualização

Acesso: usuários da empresa podem ler o registro da própria empresa; criar, editar e apagar apenas administradores e gerentes (mesmo padrão das outras tabelas de propostas). Grants para usuários autenticados e para o serviço interno.

## Armazenamento de imagens

Novo bucket privado `branding-assets`, com políticas em `storage.objects`:

- Arquivos organizados em `<company_id>/<tipo>-<timestamp>.<ext>`.
- Leitura permitida a usuários da empresa dona da pasta; envio/exclusão apenas para administradores e gerentes da empresa.
- Como o bucket é privado, as imagens são exibidas via URL assinada.

## Detalhes técnicos

- Migração: `CREATE TABLE public.solar_branding` + GRANTs + RLS + policies (`get_user_company_id()`, `is_company_manager()`), índice único em `company_id`, trigger `update_updated_at_column`.
- Bucket criado pela ferramenta de storage (privado); policies de `storage.objects` via migração.
- `src/hooks/useSolarBranding.ts`: leitura com `maybeSingle()`, upsert com `onConflict: "company_id"`, upload/remoção de arquivos no bucket e geração de URL assinada (reutilizando o padrão de `src/lib/mediaSrc.ts`).
- `src/components/propostas/BrandingSection.tsx`: formulário completo (uploads, cores, rodapé dinâmico, textos), seguindo o padrão de `FixedValuesSection.tsx`.
- `src/pages/propostas/Branding.tsx` + rota `/propostas/configuracoes/personalizacao` em `src/App.tsx`.
- Nova aba `Personalização` em `src/pages/propostas/Settings.tsx`.
- Ao final: typecheck e verificação visual da página.
