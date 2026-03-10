
CREATE TABLE public.student_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  goals text[] NOT NULL DEFAULT '{}',
  study_style text,
  weekly_study_hours text,
  biggest_challenge text,
  motivation_type text,
  preferred_session_length text,
  learning_method text,
  stress_management text,
  social_preference text,
  additional_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own persona"
  ON public.student_personas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own persona"
  ON public.student_personas FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own persona"
  ON public.student_personas FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
