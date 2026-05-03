
CREATE TABLE IF NOT EXISTS public.professor_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL,
  course_name text NOT NULL,
  university_id uuid NOT NULL,
  year integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professor_id, course_name, university_id)
);

CREATE INDEX IF NOT EXISTS idx_professor_courses_prof ON public.professor_courses(professor_id);
CREATE INDEX IF NOT EXISTS idx_professor_courses_uni_course ON public.professor_courses(university_id, course_name);

ALTER TABLE public.professor_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors can view own course mappings"
  ON public.professor_courses FOR SELECT TO authenticated
  USING (auth.uid() = professor_id);

CREATE POLICY "Professors can insert own course mappings"
  ON public.professor_courses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = professor_id AND has_role(auth.uid(), 'professor'::app_role));

CREATE POLICY "Professors can delete own course mappings"
  ON public.professor_courses FOR DELETE TO authenticated
  USING (auth.uid() = professor_id);

CREATE POLICY "Admins can view all professor courses"
  ON public.professor_courses FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uni admins can view uni professor courses"
  ON public.professor_courses FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role)
         AND university_id = get_user_university_id(auth.uid()));

-- Helper for RLS: does this professor teach this course at this university?
CREATE OR REPLACE FUNCTION public.professor_teaches(_user_id uuid, _university_id uuid, _course_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professor_courses
    WHERE professor_id = _user_id
      AND university_id = _university_id
      AND course_name = _course_name
  );
$$;

REVOKE EXECUTE ON FUNCTION public.professor_teaches(uuid, uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.professor_teaches(uuid, uuid, text) TO authenticated;

CREATE POLICY "Professors can view study logs for their courses"
  ON public.study_logs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'professor'::app_role)
    AND university_id IS NOT NULL
    AND professor_teaches(auth.uid(), university_id, subject)
  );
