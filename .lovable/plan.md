

## Plano: Criar bucket `media-messages` no Storage

### O que será feito
Criar o bucket público `media-messages` no Storage via migration SQL, com políticas de acesso que permitam:
- **Upload**: qualquer requisição autenticada (ou via service_role key do N8N)
- **Leitura pública**: para que as URLs dos MP3 sejam acessíveis pelo frontend e WhatsApp

### Migration SQL
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-messages', 'media-messages', true);

-- Leitura pública
CREATE POLICY "Public read media-messages"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-messages');

-- Upload por usuários autenticados
CREATE POLICY "Authenticated upload media-messages"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media-messages');

-- Delete por usuários autenticados
CREATE POLICY "Authenticated delete media-messages"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media-messages');
```

### Arquivo modificado
- Nova migration SQL

