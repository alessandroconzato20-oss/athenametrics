CREATE TABLE public.topic_mastery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_name TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'red' CHECK (status IN ('red', 'orange', 'green')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_name, topic_name)
);

ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topic mastery" ON public.topic_mastery FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own topic mastery" ON public.topic_mastery FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topic mastery" ON public.topic_mastery FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);