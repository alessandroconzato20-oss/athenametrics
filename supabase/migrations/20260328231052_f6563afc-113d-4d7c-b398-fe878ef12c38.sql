CREATE POLICY "Admins can view all student personas"
ON public.student_personas
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));