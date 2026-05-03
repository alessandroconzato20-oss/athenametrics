
-- 1. Table
CREATE TABLE public.cohort_invite_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  university_id UUID NOT NULL,
  university_name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  label TEXT,
  year INTEGER,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cohort_invite_codes_uni ON public.cohort_invite_codes(university_id);
CREATE INDEX idx_cohort_invite_codes_code ON public.cohort_invite_codes(code);

ALTER TABLE public.cohort_invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global admins manage all cohort codes"
  ON public.cohort_invite_codes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uni admins view own cohort codes"
  ON public.cohort_invite_codes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

CREATE POLICY "Uni admins insert own cohort codes"
  ON public.cohort_invite_codes FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'university_admin'::app_role)
    AND university_id = get_user_university_id(auth.uid())
    AND auth.uid() = created_by
  );

CREATE POLICY "Uni admins update own cohort codes"
  ON public.cohort_invite_codes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

CREATE POLICY "Uni admins delete own cohort codes"
  ON public.cohort_invite_codes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role) AND university_id = get_user_university_id(auth.uid()));

CREATE TRIGGER trg_cohort_invite_codes_updated
  BEFORE UPDATE ON public.cohort_invite_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Public validation (no auth) — returns institution name + year only, never the row id or who created it
CREATE OR REPLACE FUNCTION public.validate_cohort_code(_code TEXT)
RETURNS TABLE (valid BOOLEAN, university_name TEXT, year INTEGER, label TEXT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.cohort_invite_codes;
BEGIN
  SELECT * INTO _row FROM public.cohort_invite_codes WHERE upper(code) = upper(_code) LIMIT 1;
  IF _row.id IS NULL
     OR _row.is_active = false
     OR (_row.expires_at IS NOT NULL AND _row.expires_at < now())
     OR (_row.max_uses IS NOT NULL AND _row.uses_count >= _row.max_uses)
  THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::TEXT;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, _row.university_name, _row.year, _row.label;
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_cohort_code(TEXT) TO anon, authenticated;

-- 3. Redeem (called by signup trigger)
CREATE OR REPLACE FUNCTION public.redeem_cohort_code(_user_id UUID, _code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.cohort_invite_codes;
BEGIN
  SELECT * INTO _row FROM public.cohort_invite_codes WHERE upper(code) = upper(_code) FOR UPDATE;
  IF _row.id IS NULL
     OR _row.is_active = false
     OR (_row.expires_at IS NOT NULL AND _row.expires_at < now())
     OR (_row.max_uses IS NOT NULL AND _row.uses_count >= _row.max_uses)
  THEN
    RETURN false;
  END IF;

  -- Ensure the university exists & has correct id
  INSERT INTO public.universities (id, name) VALUES (_row.university_id, _row.university_name)
    ON CONFLICT (name) DO NOTHING;

  UPDATE public.profiles
     SET university_id = _row.university_id,
         university    = _row.university_name
   WHERE id = _user_id;

  UPDATE public.cohort_invite_codes
     SET uses_count = uses_count + 1
   WHERE id = _row.id;

  RETURN true;
END;
$$;

-- 4. Replace the signup trigger to honour cohort_code first
CREATE OR REPLACE FUNCTION public.handle_new_user_university()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code TEXT;
  _uni_name TEXT;
  _uni_id UUID;
BEGIN
  _code := NEW.raw_user_meta_data ->> 'cohort_code';
  _uni_name := NEW.raw_user_meta_data ->> 'university';

  -- Insert profile shell first (so redeem_cohort_code can update it)
  INSERT INTO public.profiles (id, username, matricola)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'matricola'
  )
  ON CONFLICT (id) DO NOTHING;

  IF _code IS NOT NULL AND _code <> '' THEN
    PERFORM public.redeem_cohort_code(NEW.id, _code);
  ELSIF _uni_name IS NOT NULL AND _uni_name <> '' THEN
    -- Legacy fallback: free-text university (existing accounts / uni-admin signup)
    INSERT INTO public.universities (name) VALUES (_uni_name) ON CONFLICT (name) DO NOTHING;
    SELECT id INTO _uni_id FROM public.universities WHERE name = _uni_name;
    UPDATE public.profiles
       SET university_id = _uni_id, university = _uni_name
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
