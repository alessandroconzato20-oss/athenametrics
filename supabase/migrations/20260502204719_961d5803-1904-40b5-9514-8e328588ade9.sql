ALTER TABLE public.study_logs
  ADD COLUMN IF NOT EXISTS study_method text,
  ADD COLUMN IF NOT EXISTS study_method_other text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS location_other text;

CREATE INDEX IF NOT EXISTS idx_study_logs_study_method ON public.study_logs(study_method);
CREATE INDEX IF NOT EXISTS idx_study_logs_location ON public.study_logs(location);