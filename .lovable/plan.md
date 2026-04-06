

## Plano: Corrigir URL do QR Code de Check-in

### Problema
O QR code gerado usa `window.location.origin`, que no ambiente de desenvolvimento é a URL do Lovable preview (`id-preview--xxx.lovable.app`). Quando alguém externo escaneia o QR code, é levado para essa URL do Lovable em vez de um domínio de produção.

### Solução
Adicionar um campo configurável de **domínio base** para os links de check-in, permitindo que a empresa defina a URL pública correta (ex: `https://meuapp.com`). Se não configurado, usa `window.location.origin` como fallback.

### Alterações

**1. `src/components/checkin/CheckinLinksManager.tsx`**
- Adicionar um campo de texto no topo para "URL base do check-in" (ex: `https://meuapp.lovable.app`)
- Salvar essa configuração via `admin_settings` com a chave `checkin_base_url`
- Usar essa URL base ao gerar o link do QR code e ao copiar o link, com fallback para `window.location.origin`

**2. `src/hooks/useAdminSettings.ts`**
- Garantir que a chave `checkin_base_url` funcione com o hook existente de admin settings

### Alternativa mais simples (recomendada)
Se o app for publicado no Lovable (ex: `https://xxx.lovable.app`), basta **publicar o projeto** e o QR code automaticamente usará a URL correta. A URL de preview (`id-preview--`) é apenas para desenvolvimento.

### Resumo
- A funcionalidade do check-in está correta (edge function funciona, redirecionamento WhatsApp funciona)
- O problema é apenas que o QR code aponta para a URL de preview do Lovable
- Solução: publicar o app ou adicionar campo configurável de URL base

