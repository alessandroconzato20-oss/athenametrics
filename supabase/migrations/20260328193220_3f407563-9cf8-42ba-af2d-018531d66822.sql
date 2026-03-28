
CREATE POLICY "Admins can delete study logs"
ON public.study_logs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete daily scores"
ON public.daily_scores
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
