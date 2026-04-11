-- Create exam_passes table
CREATE TABLE public.exam_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  passed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  university_id UUID REFERENCES public.universities(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_name)
);

-- Enable RLS
ALTER TABLE public.exam_passes ENABLE ROW LEVEL SECURITY;

-- Students can view their own passes
CREATE POLICY "Users can view own exam passes"
  ON public.exam_passes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Students can insert their own passes
CREATE POLICY "Users can insert own exam passes"
  ON public.exam_passes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Students can delete their own passes (uncheck)
CREATE POLICY "Users can delete own exam passes"
  ON public.exam_passes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Global admins can view all
CREATE POLICY "Admins can view all exam passes"
  ON public.exam_passes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- University admins can view their uni's passes
CREATE POLICY "Uni admins can view uni exam passes"
  ON public.exam_passes FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'university_admin'::app_role)
    AND university_id = get_user_university_id(auth.uid())
  );

-- Support team can view their uni's passes
CREATE POLICY "Support team can view uni exam passes"
  ON public.exam_passes FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'support_team'::app_role)
    AND university_id = get_user_university_id(auth.uid())
  );
