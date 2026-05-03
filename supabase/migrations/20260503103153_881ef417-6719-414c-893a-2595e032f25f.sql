
-- 1. profiles: onboarding_completed
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2. university_syllabi: is_blocking_exam + university_id
ALTER TABLE public.university_syllabi
  ADD COLUMN IF NOT EXISTS is_blocking_exam boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS university_id uuid;

-- Backfill university_id by name match
UPDATE public.university_syllabi s
   SET university_id = u.id
  FROM public.universities u
 WHERE s.university_id IS NULL
   AND lower(s.university_name) = lower(u.name);

CREATE INDEX IF NOT EXISTS idx_university_syllabi_university_id ON public.university_syllabi(university_id);
CREATE INDEX IF NOT EXISTS idx_university_syllabi_blocking ON public.university_syllabi(university_id, is_blocking_exam) WHERE is_blocking_exam = true;

-- 3. university_onboarding_progress
CREATE TABLE IF NOT EXISTS public.university_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL UNIQUE,
  admin_user_id uuid NOT NULL,
  step_completed integer NOT NULL DEFAULT 0,
  programme_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  calendar_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  welfare_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  retention_acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.university_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global admins manage all onboarding progress"
  ON public.university_onboarding_progress
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uni admins view own onboarding progress"
  ON public.university_onboarding_progress
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role)
         AND university_id = get_user_university_id(auth.uid()));

CREATE POLICY "Uni admins insert own onboarding progress"
  ON public.university_onboarding_progress
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'university_admin'::app_role)
              AND university_id = get_user_university_id(auth.uid())
              AND admin_user_id = auth.uid());

CREATE POLICY "Uni admins update own onboarding progress"
  ON public.university_onboarding_progress
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role)
         AND university_id = get_user_university_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'university_admin'::app_role)
              AND university_id = get_user_university_id(auth.uid()));

CREATE TRIGGER trg_uop_updated_at
  BEFORE UPDATE ON public.university_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. university_academic_calendar
CREATE TABLE IF NOT EXISTS public.university_academic_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('semester','exam_period','reading_week','holiday')),
  event_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  year_group integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uac_university_id ON public.university_academic_calendar(university_id);

ALTER TABLE public.university_academic_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global admins manage all academic calendar"
  ON public.university_academic_calendar
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uni admins manage own academic calendar"
  ON public.university_academic_calendar
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role)
         AND university_id = get_user_university_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'university_admin'::app_role)
              AND university_id = get_user_university_id(auth.uid()));

CREATE POLICY "Students view own university calendar"
  ON public.university_academic_calendar
  FOR SELECT TO authenticated
  USING (university_id = get_user_university_id(auth.uid()));

-- 5. university_welfare_config
CREATE TABLE IF NOT EXISTS public.university_welfare_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL UNIQUE,
  support_url text,
  support_email text,
  crisis_line text,
  burnout_alert_threshold_pct integer NOT NULL DEFAULT 10,
  data_retention_months integer,
  legal_basis text CHECK (legal_basis IN ('consent','legitimate_interests')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.university_welfare_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global admins manage all welfare config"
  ON public.university_welfare_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uni admins manage own welfare config"
  ON public.university_welfare_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role)
         AND university_id = get_user_university_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'university_admin'::app_role)
              AND university_id = get_user_university_id(auth.uid()));

CREATE POLICY "Students view own university welfare config"
  ON public.university_welfare_config
  FOR SELECT TO authenticated
  USING (university_id = get_user_university_id(auth.uid()));

CREATE TRIGGER trg_uwc_updated_at
  BEFORE UPDATE ON public.university_welfare_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
