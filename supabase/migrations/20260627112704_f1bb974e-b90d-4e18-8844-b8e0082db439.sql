ALTER TABLE public.study_sessions
  ADD COLUMN IF NOT EXISTS planned_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS background_away_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS background_away_count integer NOT NULL DEFAULT 0;