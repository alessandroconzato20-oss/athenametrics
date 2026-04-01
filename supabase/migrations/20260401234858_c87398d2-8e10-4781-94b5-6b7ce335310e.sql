
CREATE POLICY "Admins can view all topic mastery" ON public.topic_mastery
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'university_admin'::app_role));
