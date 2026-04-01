-- Create university_syllabi table
CREATE TABLE public.university_syllabi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  university_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  credits INTEGER,
  year INTEGER NOT NULL,
  semester INTEGER DEFAULT 0,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  pdf_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  uploaded_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.university_syllabi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "University admins can insert own syllabi"
ON public.university_syllabi FOR INSERT TO authenticated
WITH CHECK (auth.uid() = uploaded_by AND (has_role(auth.uid(), 'university_admin') OR has_role(auth.uid(), 'admin')));

CREATE POLICY "University admins can update own syllabi"
ON public.university_syllabi FOR UPDATE TO authenticated
USING (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'));

CREATE POLICY "University admins can delete own syllabi"
ON public.university_syllabi FOR DELETE TO authenticated
USING (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all syllabi"
ON public.university_syllabi FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'university_admin'));

CREATE POLICY "Users can view approved syllabi"
ON public.university_syllabi FOR SELECT TO authenticated
USING (status = 'approved');

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('syllabi', 'syllabi', false);

CREATE POLICY "Auth users can upload syllabi PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'syllabi');

CREATE POLICY "Auth users can view syllabi PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'syllabi');

CREATE POLICY "Admins can delete syllabi PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'syllabi' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'university_admin')));

-- Add university to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university TEXT;