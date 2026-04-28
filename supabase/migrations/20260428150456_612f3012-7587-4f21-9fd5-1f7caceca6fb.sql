ALTER TABLE public.daily_wellbeing_checkins
  ADD COLUMN IF NOT EXISTS did_exercise boolean,
  ADD COLUMN IF NOT EXISTS exercise_type text,
  ADD COLUMN IF NOT EXISTS exercise_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS study_plan_window text;