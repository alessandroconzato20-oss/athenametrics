-- 1. Topic mastery: split admin policy so university_admin scoped by university
DROP POLICY IF EXISTS "Admins can view all topic mastery" ON public.topic_mastery;

CREATE POLICY "Global admins can view all topic mastery"
  ON public.topic_mastery
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uni admins can view uni topic mastery"
  ON public.topic_mastery
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'university_admin'::app_role)
    AND university_id = get_user_university_id(auth.uid())
  );

-- 2. Daily scores: uniqueness per (user_id, score_date)
ALTER TABLE public.daily_scores
  ADD CONSTRAINT daily_scores_user_date_unique UNIQUE (user_id, score_date);

-- 3. Profiles: trial fields + onboarded_at
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS trial_arm TEXT,
  ADD COLUMN IF NOT EXISTS trial_consent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_consent_version TEXT;

-- Validate trial_status values
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_trial_status_check
  CHECK (trial_status IN ('none', 'enrolled', 'control', 'withdrawn'));

-- Allow admins to update trial_status / trial_arm on profiles (via dedicated policy)
CREATE POLICY "Admins can update profiles for trial management"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uni admins can update uni profiles for trial management"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'university_admin'::app_role)
    AND university_id = get_user_university_id(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'university_admin'::app_role)
    AND university_id = get_user_university_id(auth.uid())
  );

-- 4. University login keys: bind policies to authenticated only
DROP POLICY IF EXISTS "Admins can view all login keys" ON public.university_login_keys;
DROP POLICY IF EXISTS "System can manage keys" ON public.university_login_keys;
DROP POLICY IF EXISTS "Users can view own login key" ON public.university_login_keys;

CREATE POLICY "Admins can view all login keys"
  ON public.university_login_keys
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage keys"
  ON public.university_login_keys
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own login key"
  ON public.university_login_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Admin audit log
CREATE TABLE public.admin_access_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  target_user_id UUID,
  action TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  university_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all access logs"
  ON public.admin_access_log
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uni admins can view uni access logs"
  ON public.admin_access_log
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'university_admin'::app_role)
    AND university_id = get_user_university_id(auth.uid())
  );

CREATE POLICY "Authenticated admins can insert audit entries"
  ON public.admin_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = admin_user_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'university_admin'::app_role)
      OR has_role(auth.uid(), 'support_team'::app_role)
    )
  );

CREATE INDEX idx_admin_access_log_admin ON public.admin_access_log(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_access_log_target ON public.admin_access_log(target_user_id, created_at DESC);

-- 6. Exam grade validation (Italian medical scale 18-30 + lode)
ALTER TABLE public.exam_passes
  ADD COLUMN IF NOT EXISTS cum_laude BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.exam_passes
  ADD CONSTRAINT exam_passes_grade_range_check
  CHECK (grade IS NULL OR (grade >= 18 AND grade <= 30));