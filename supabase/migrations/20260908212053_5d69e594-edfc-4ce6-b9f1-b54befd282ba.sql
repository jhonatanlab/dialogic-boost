CREATE POLICY "contact_files_read_company" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contact-files'
    AND (storage.foldername(name))[1] = public.get_user_company_id()::text
  );

CREATE POLICY "contact_files_insert_company" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contact-files'
    AND (storage.foldername(name))[1] = public.get_user_company_id()::text
  );

CREATE POLICY "contact_files_delete_company" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'contact-files'
    AND (storage.foldername(name))[1] = public.get_user_company_id()::text
  );