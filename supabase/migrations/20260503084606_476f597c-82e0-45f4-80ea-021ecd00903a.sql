
-- 1. daily_biometrics
CREATE TABLE public.daily_biometrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  university_id UUID,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hrv_sdnn NUMERIC,
  hrv_available BOOLEAN NOT NULL DEFAULT false,
  resting_hr NUMERIC,
  sleep_duration_hours NUMERIC,
  sleep_rem_percent NUMERIC,
  sleep_sws_percent NUMERIC,
  spo2_percent NUMERIC,
  sleep_timing_variance_7d NUMERIC,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recorded_date)
);
CREATE INDEX idx_daily_biometrics_user_date ON public.daily_biometrics(user_id, recorded_date);
CREATE INDEX idx_daily_biometrics_uni_date ON public.daily_biometrics(university_id, recorded_date);
ALTER TABLE public.daily_biometrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own biometrics" ON public.daily_biometrics
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own biometrics" ON public.daily_biometrics
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own biometrics" ON public.daily_biometrics
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all biometrics" ON public.daily_biometrics
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Uni admins view uni biometrics" ON public.daily_biometrics
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

CREATE TRIGGER trg_daily_biometrics_updated
  BEFORE UPDATE ON public.daily_biometrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. evening_checkins
CREATE TABLE public.evening_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  university_id UUID,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  night_factor_alcohol BOOLEAN NOT NULL DEFAULT false,
  night_factor_caffeine BOOLEAN NOT NULL DEFAULT false,
  night_factor_screen BOOLEAN NOT NULL DEFAULT false,
  night_factor_stress BOOLEAN NOT NULL DEFAULT false,
  night_factor_unwell BOOLEAN NOT NULL DEFAULT false,
  nightly_pss_score INTEGER,
  intended_sleep_time TIME,
  wind_down_activity TEXT,
  screen_time_before_bed_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);
CREATE INDEX idx_evening_checkins_user_date ON public.evening_checkins(user_id, checkin_date);
CREATE INDEX idx_evening_checkins_uni_date ON public.evening_checkins(university_id, checkin_date);
ALTER TABLE public.evening_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own evening checkins" ON public.evening_checkins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own evening checkins" ON public.evening_checkins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own evening checkins" ON public.evening_checkins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all evening checkins" ON public.evening_checkins
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Uni admins view uni evening checkins" ON public.evening_checkins
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

CREATE TRIGGER trg_evening_checkins_updated
  BEFORE UPDATE ON public.evening_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. chronotype_profiles
CREATE TABLE public.chronotype_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  university_id UUID,
  msfsc_midpoint TIME,
  sleep_duration_workdays_hours NUMERIC,
  sleep_duration_free_hours NUMERIC,
  social_jetlag_hours NUMERIC,
  chronotype_category TEXT,
  raw_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chronotype_uni ON public.chronotype_profiles(university_id);
ALTER TABLE public.chronotype_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own chronotype" ON public.chronotype_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own chronotype" ON public.chronotype_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own chronotype" ON public.chronotype_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all chronotypes" ON public.chronotype_profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Uni admins view uni chronotypes" ON public.chronotype_profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

CREATE TRIGGER trg_chronotype_updated
  BEFORE UPDATE ON public.chronotype_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
