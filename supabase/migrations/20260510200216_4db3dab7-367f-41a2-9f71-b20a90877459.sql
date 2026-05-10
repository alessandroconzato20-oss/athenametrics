
CREATE TABLE IF NOT EXISTS public.student_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  university_id UUID,
  quiz_key TEXT NOT NULL,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quiz_key)
);

ALTER TABLE public.student_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own quizzes"
  ON public.student_quizzes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own quizzes"
  ON public.student_quizzes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own quizzes"
  ON public.student_quizzes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own quizzes"
  ON public.student_quizzes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "University admins view their students' quizzes"
  ON public.student_quizzes FOR SELECT
  USING (
    public.has_role(auth.uid(), 'university_admin'::app_role)
    AND university_id IS NOT NULL
    AND public.get_user_university_id(auth.uid()) = university_id
  );

CREATE TRIGGER set_student_quizzes_updated_at
  BEFORE UPDATE ON public.student_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_student_quizzes_user ON public.student_quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_student_quizzes_university ON public.student_quizzes(university_id);
