INSERT INTO storage.buckets (id, name, public)
VALUES ('media-messages', 'media-messages', true);

CREATE POLICY "Public read media-messages"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-messages');

CREATE POLICY "Authenticated upload media-messages"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media-messages');

CREATE POLICY "Authenticated delete media-messages"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media-messages');