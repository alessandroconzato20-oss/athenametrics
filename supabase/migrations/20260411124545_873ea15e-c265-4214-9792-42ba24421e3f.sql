
-- 1. Create universities table
CREATE TABLE public.universities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view universities" ON public.universities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only global admins can manage universities" ON public.universities FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Backfill universities from existing profile data
INSERT INTO public.universities (name)
SELECT DISTINCT university FROM public.profiles WHERE university IS NOT NULL AND university != ''
ON CONFLICT (name) DO NOTHING;

-- Also from university_access_codes
INSERT INTO public.universities (name)
SELECT DISTINCT university_name FROM public.university_access_codes WHERE university_name IS NOT NULL AND university_name != ''
ON CONFLICT (name) DO NOTHING;

-- Also from university_syllabi
INSERT INTO public.universities (name)
SELECT DISTINCT university_name FROM public.university_syllabi WHERE university_name IS NOT NULL AND university_name != ''
ON CONFLICT (name) DO NOTHING;

-- 3. Add university_id to profiles
ALTER TABLE public.profiles ADD COLUMN university_id UUID REFERENCES public.universities(id);

-- Backfill profiles.university_id
UPDATE public.profiles p
SET university_id = u.id
FROM public.universities u
WHERE p.university = u.name AND p.university IS NOT NULL;

-- 4. Helper function: get university_id for current user
CREATE OR REPLACE FUNCTION public.get_user_university_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT university_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- 5. Add university_id to all existing tables
ALTER TABLE public.study_logs ADD COLUMN university_id UUID REFERENCES public.universities(id);
ALTER TABLE public.daily_scores ADD COLUMN university_id UUID REFERENCES public.universities(id);
ALTER TABLE public.daily_wellbeing_checkins ADD COLUMN university_id UUID REFERENCES public.universities(id);
ALTER TABLE public.topic_mastery ADD COLUMN university_id UUID REFERENCES public.universities(id);
ALTER TABLE public.student_personas ADD COLUMN university_id UUID REFERENCES public.universities(id);
ALTER TABLE public.weekly_goals ADD COLUMN university_id UUID REFERENCES public.universities(id);
ALTER TABLE public.study_schedule ADD COLUMN university_id UUID REFERENCES public.universities(id);
ALTER TABLE public.user_feedback ADD COLUMN university_id UUID REFERENCES public.universities(id);
ALTER TABLE public.consent_logs ADD COLUMN university_id UUID REFERENCES public.universities(id);

-- Backfill university_id on all tables from profiles
UPDATE public.study_logs sl SET university_id = p.university_id FROM public.profiles p WHERE sl.user_id = p.id;
UPDATE public.daily_scores ds SET university_id = p.university_id FROM public.profiles p WHERE ds.user_id = p.id;
UPDATE public.daily_wellbeing_checkins dwc SET university_id = p.university_id FROM public.profiles p WHERE dwc.user_id = p.id;
UPDATE public.topic_mastery tm SET university_id = p.university_id FROM public.profiles p WHERE tm.user_id = p.id;
UPDATE public.student_personas sp SET university_id = p.university_id FROM public.profiles p WHERE sp.user_id = p.id;
UPDATE public.weekly_goals wg SET university_id = p.university_id FROM public.profiles p WHERE wg.user_id = p.id;
UPDATE public.study_schedule ss SET university_id = p.university_id FROM public.profiles p WHERE ss.user_id = p.id;
UPDATE public.user_feedback uf SET university_id = p.university_id FROM public.profiles p WHERE uf.user_id = p.id;
UPDATE public.consent_logs cl SET university_id = p.university_id FROM public.profiles p WHERE cl.user_id = p.id;

-- 6. Create new tables
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  university_id UUID REFERENCES public.universities(id),
  survey_type TEXT NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.assessment_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  university_id UUID REFERENCES public.universities(id),
  course_name TEXT NOT NULL,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL DEFAULT 100,
  assessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.biometric_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  university_id UUID REFERENCES public.universities(id),
  snapshot_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.biometric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ml_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  university_id UUID REFERENCES public.universities(id),
  prediction_type TEXT NOT NULL,
  prediction_data JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for new tables (pattern: owner + university admin + global admin)

-- survey_responses
CREATE POLICY "Users can view own survey responses" ON public.survey_responses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own survey responses" ON public.survey_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Uni admins can view uni survey responses" ON public.survey_responses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));
CREATE POLICY "Global admins can view all survey responses" ON public.survey_responses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- assessment_results
CREATE POLICY "Users can view own assessments" ON public.assessment_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessments" ON public.assessment_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Uni admins can view uni assessments" ON public.assessment_results FOR SELECT TO authenticated USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));
CREATE POLICY "Global admins can view all assessments" ON public.assessment_results FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- biometric_snapshots
CREATE POLICY "Users can view own biometrics" ON public.biometric_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own biometrics" ON public.biometric_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Uni admins can view uni biometrics" ON public.biometric_snapshots FOR SELECT TO authenticated USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));
CREATE POLICY "Global admins can view all biometrics" ON public.biometric_snapshots FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ml_predictions
CREATE POLICY "Users can view own predictions" ON public.ml_predictions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own predictions" ON public.ml_predictions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Uni admins can view uni predictions" ON public.ml_predictions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));
CREATE POLICY "Global admins can view all predictions" ON public.ml_predictions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. Update existing RLS policies to add university-scoped access for university_admins

-- study_logs: add university_admin policy
CREATE POLICY "Uni admins can view uni study logs" ON public.study_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

-- daily_scores: add university_admin policy
CREATE POLICY "Uni admins can view uni daily scores" ON public.daily_scores FOR SELECT TO authenticated USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

-- daily_wellbeing_checkins: add university_admin policy
CREATE POLICY "Uni admins can view uni checkins" ON public.daily_wellbeing_checkins FOR SELECT TO authenticated USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

-- topic_mastery: already has uni admin policy but let's ensure it uses university_id
-- (existing policy uses has_role which is fine, but doesn't scope by university)

-- student_personas: add university_admin policy
CREATE POLICY "Uni admins can view uni personas" ON public.student_personas FOR SELECT TO authenticated USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

-- profiles: add university_admin policy
CREATE POLICY "Uni admins can view uni profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

-- 9. Trigger to auto-set university_id on new profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_university()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uni_name TEXT;
  _uni_id UUID;
BEGIN
  _uni_name := NEW.raw_user_meta_data ->> 'university';
  IF _uni_name IS NOT NULL AND _uni_name != '' THEN
    -- Ensure university exists
    INSERT INTO public.universities (name) VALUES (_uni_name) ON CONFLICT (name) DO NOTHING;
    SELECT id INTO _uni_id FROM public.universities WHERE name = _uni_name;
    
    -- Insert profile with university_id
    INSERT INTO public.profiles (id, username, university, matricola, university_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
      _uni_name,
      NEW.raw_user_meta_data ->> 'matricola',
      _uni_id
    )
    ON CONFLICT (id) DO UPDATE SET university_id = _uni_id, university = _uni_name;
  ELSE
    INSERT INTO public.profiles (id, username, university, matricola)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
      _uni_name,
      NEW.raw_user_meta_data ->> 'matricola'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_university
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_university();
