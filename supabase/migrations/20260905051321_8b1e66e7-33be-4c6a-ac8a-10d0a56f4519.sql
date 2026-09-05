DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='wa_media_company_read'
  ) THEN
    CREATE POLICY wa_media_company_read ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'whatsapp-media'
        AND (storage.foldername(name))[1] = public.get_user_company_id()::text
      );
  END IF;
END $$;