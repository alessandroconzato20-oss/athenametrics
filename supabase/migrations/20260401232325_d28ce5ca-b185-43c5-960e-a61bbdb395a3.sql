
ALTER TABLE public.study_logs
  ADD COLUMN comprehension_level integer,
  ADD COLUMN confidence_level integer,
  ADD COLUMN revision_priority integer,
  ADD COLUMN teaching_readiness integer;
