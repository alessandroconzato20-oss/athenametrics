
DROP POLICY IF EXISTS "University admins can upload syllabi PDFs" ON storage.objects;

CREATE POLICY "University admins can upload syllabi PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'syllabi'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'university_admin'::app_role)
  )
  AND (storage.foldername(name))[1] = auth.uid()::text
);
