

## Admin SaaS - WhatsApp n8n Webhooks Page

### Overview
Create a new admin page at `/settings/admin-whatsapp` for managing WhatsApp instances via n8n webhooks, with dark-themed UI matching the EloChat/LeadChat design system.

### Database Migration
Create `admin_settings` table:
- `id` uuid PK
- `user_id` uuid NOT NULL
- `setting_key` text NOT NULL
- `setting_value` text
- `created_at`, `updated_at` timestamps
- Unique constraint on `(user_id, setting_key)`
- RLS: users can CRUD their own settings

Create `whatsapp_instances` table:
- `id` uuid PK
- `user_id` uuid NOT NULL
- `company_name` text NOT NULL
- `instance_id` text
- `status` text DEFAULT 'disconnected'
- `created_at`, `updated_at` timestamps
- RLS: users can CRUD their own instances

### New Files

**`src/pages/AdminWhatsapp.tsx`** - Main page with:
- Header: "Admin SaaS" title + "WhatsApp - n8n Webhooks" subtitle + Settings icon
- Left column (2/3 width):
  - "Conexao com n8n" card: N8N Base URL input, Webhook Secret input, 4 endpoint fields pre-filled with example n8n URLs, orange "Salvar Configuracao" button
  - "Instancia por Empresa" card: Select dropdown (from `whatsapp_instances` or mock data), "Criar/Join" + "Apagar" buttons that log to console
  - "Instancias Ativas" table: columns for company name, instance ID, status badge (green/red), action icons (trash, refresh)
- Right column (1/3 width):
  - "Status da Configuracao" card showing connection status and active n8n URL

**`src/hooks/useAdminSettings.ts`** - Hook for CRUD on `admin_settings` table using react-query

### Routing
- Add route `/settings/admin-whatsapp` in `App.tsx`
- Add card in `Settings.tsx` linking to the new page

### Technical Details
- Settings keys stored: `n8n_base_url`, `n8n_webhook_secret`, `n8n_create_instance`, `n8n_generate_qr`, `n8n_delete_instance`, `n8n_send_message`
- Save/load via upsert on `admin_settings` table
- Instance buttons: `console.log("Integração com n8n será feita via Webhook")`
- Dark mode styling using existing Tailwind theme classes + coral/orange accent (`bg-orange-500`)
- Lucide icons: Settings, Trash2, RefreshCw, Wifi, WifiOff, Plus, Link

