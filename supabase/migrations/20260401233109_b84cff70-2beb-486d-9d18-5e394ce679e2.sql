
DROP POLICY IF EXISTS "Only admins can view access codes" ON public.university_access_codes;
DROP POLICY IF EXISTS "Only admins can insert access codes" ON public.university_access_codes;
DROP POLICY IF EXISTS "Only admins can update access codes" ON public.university_access_codes;
DROP POLICY IF EXISTS "Only admins can delete access codes" ON public.university_access_codes;

CREATE POLICY "Only admins can view access codes" ON public.university_access_codes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can insert access codes" ON public.university_access_codes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can update access codes" ON public.university_access_codes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can delete access codes" ON public.university_access_codes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
