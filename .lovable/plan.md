

## Plano: Exibir Company ID e Webhook Secret na aba API Automação

### O que será feito

Na aba "API Automação" em Configurações → Integrações WhatsApp, adicionar uma seção informativa **sempre visível** (independente do toggle estar ativo) com:

1. **Company ID** — campo somente leitura exibindo o `companyId` da empresa logada, com botão de copiar
2. **Webhook Secret** — campo somente leitura exibindo o valor de `n8n_webhook_secret` (obtido via `useAdminSettings`), com botão de copiar. Se não estiver configurado, exibe badge "Não configurado"

### Alteração

**`src/pages/WhatsappIntegrations.tsx`**
- Dentro do `TabsContent value="automation"`, antes do toggle, adicionar um `Card` com título "Credenciais de Integração"
- Dois campos read-only em grid: Company ID e Webhook Secret
- Cada campo com `Input readOnly` + botão `Copy`/`Check` (mesmo padrão já usado nos webhooks de Meta/Z-API)
- O `companyId` já está disponível via `useCompany()`
- O `webhookSecret` será lido via `getSettingValue("n8n_webhook_secret")` que já está importado

### Detalhes técnicos
- Reutilizar o estado `copiedWebhook` existente ou criar estados separados (`copiedCompanyId`, `copiedSecret`) para feedback visual independente
- Manter design consistente com os demais campos readonly do componente

