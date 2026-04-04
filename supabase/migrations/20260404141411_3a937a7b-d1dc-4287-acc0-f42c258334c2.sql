
CREATE TABLE public.daily_wellbeing_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rest_level INTEGER NOT NULL,
  stress_level INTEGER NOT NULL,
  motivation_level INTEGER NOT NULL,
  night_factors TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

ALTER TABLE public.daily_wellbeing_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins"
ON public.daily_wellbeing_checkins FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
ON public.daily_wellbeing_checkins FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins"
ON public.daily_wellbeing_checkins FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all checkins"
ON public.daily_wellbeing_checkins FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
