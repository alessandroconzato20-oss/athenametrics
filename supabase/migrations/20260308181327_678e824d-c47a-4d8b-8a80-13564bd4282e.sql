-- Store daily computed scores for trend tracking
CREATE TABLE public.daily_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  burnout_risk INTEGER NOT NULL CHECK (burnout_risk BETWEEN 0 AND 100),
  cognitive_readiness INTEGER CHECK (cognitive_readiness BETWEEN 0 AND 100),
  retention_outlook INTEGER CHECK (retention_outlook BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, score_date)
);

ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily scores"
  ON public.daily_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily scores"
  ON public.daily_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily scores"
  ON public.daily_scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_daily_scores_user_date ON public.daily_scores(user_id, score_date DESC);