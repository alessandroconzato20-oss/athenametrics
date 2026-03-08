-- Create study_logs table
CREATE TABLE public.study_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  stress_level INTEGER NOT NULL CHECK (stress_level BETWEEN 1 AND 5),
  distraction_level INTEGER NOT NULL CHECK (distraction_level BETWEEN 1 AND 5),
  energy_level INTEGER NOT NULL CHECK (energy_level BETWEEN 1 AND 5),
  notes TEXT,
  studied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own logs
CREATE POLICY "Users can view their own study logs"
  ON public.study_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study logs"
  ON public.study_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study logs"
  ON public.study_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study logs"
  ON public.study_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_study_logs_user_id ON public.study_logs(user_id);
CREATE INDEX idx_study_logs_studied_at ON public.study_logs(studied_at DESC);
CREATE INDEX idx_study_logs_subject ON public.study_logs(subject);