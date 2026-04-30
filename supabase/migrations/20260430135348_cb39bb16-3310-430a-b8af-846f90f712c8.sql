CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  university_id UUID,
  subject TEXT NOT NULL,
  study_method TEXT NOT NULL,
  study_method_other TEXT,
  location TEXT NOT NULL,
  location_other TEXT,
  session_start_at TIMESTAMPTZ NOT NULL,
  session_end_at TIMESTAMPTZ,
  active_duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_pause_duration_seconds INTEGER NOT NULL DEFAULT 0,
  pause_count INTEGER NOT NULL DEFAULT 0,
  pause_rate NUMERIC,
  pause_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  difficulty INTEGER,
  comprehension INTEGER,
  revision_priority INTEGER,
  confidence INTEGER,
  post_session_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own study sessions" ON public.study_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own study sessions" ON public.study_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions" ON public.study_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions" ON public.study_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Uni admins can view uni study sessions" ON public.study_sessions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

CREATE POLICY "Admins can view all study sessions" ON public.study_sessions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_study_sessions_updated_at
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_study_sessions_user_started ON public.study_sessions(user_id, session_start_at DESC);
CREATE INDEX idx_study_sessions_status ON public.study_sessions(status);