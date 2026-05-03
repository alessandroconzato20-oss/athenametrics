ALTER TABLE public.daily_scores
ADD COLUMN IF NOT EXISTS burnout_capacity_flag boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS attentional_fragmentation_flag boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_daily_scores_university_date ON public.daily_scores(university_id, score_date);