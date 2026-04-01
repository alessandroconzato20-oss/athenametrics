
-- Table to store university access codes
CREATE TABLE public.university_access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  university_name TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.university_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view access codes"
  ON public.university_access_codes FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert access codes"
  ON public.university_access_codes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update access codes"
  ON public.university_access_codes FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete access codes"
  ON public.university_access_codes FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to verify access code and assign university_admin role
CREATE OR REPLACE FUNCTION public.verify_university_code(_user_id UUID, _university_name TEXT, _access_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _valid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.university_access_codes
    WHERE university_name = _university_name
      AND access_code = _access_code
      AND is_active = true
  ) INTO _valid;

  IF _valid THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'university_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN _valid;
END;
$$;
