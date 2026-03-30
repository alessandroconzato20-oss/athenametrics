
CREATE TABLE public.study_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  schedule_date DATE NOT NULL,
  title TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedule" ON public.study_schedule
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule" ON public.study_schedule
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule" ON public.study_schedule
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule" ON public.study_schedule
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
