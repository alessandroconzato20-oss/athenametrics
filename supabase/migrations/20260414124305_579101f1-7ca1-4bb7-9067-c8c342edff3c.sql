CREATE POLICY "Users can update own exam passes"
ON public.exam_passes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);