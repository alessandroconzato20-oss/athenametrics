
CREATE TABLE public.weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly goals"
  ON public.weekly_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly goals"
  ON public.weekly_goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly goals"
  ON public.weekly_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
