
-- Consent logs for GDPR audit trail
CREATE TABLE public.consent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL,
  consented BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent logs"
ON public.consent_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent logs"
ON public.consent_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all consent logs"
ON public.consent_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to delete all user data (right to erasure)
CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to delete their own data or admins
  IF auth.uid() != _user_id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  DELETE FROM public.study_logs WHERE user_id = _user_id;
  DELETE FROM public.daily_scores WHERE user_id = _user_id;
  DELETE FROM public.student_personas WHERE user_id = _user_id;
  DELETE FROM public.topic_mastery WHERE user_id = _user_id;
  DELETE FROM public.weekly_goals WHERE user_id = _user_id;
  DELETE FROM public.study_schedule WHERE user_id = _user_id;
  DELETE FROM public.user_feedback WHERE user_id = _user_id;
  DELETE FROM public.library_members WHERE user_id = _user_id;
  DELETE FROM public.consent_logs WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
END;
$$;
