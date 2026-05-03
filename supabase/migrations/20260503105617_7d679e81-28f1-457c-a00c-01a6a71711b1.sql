-- 1. Make verify_university_code actually finish wiring the admin to a university
CREATE OR REPLACE FUNCTION public.verify_university_code(
  _user_id uuid, _university_name text, _access_code text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _valid    boolean;
  _uni_id   uuid;
  _code_uni text;
BEGIN
  -- Look up the access code and the university it was issued for
  SELECT university_name INTO _code_uni
  FROM public.university_access_codes
  WHERE access_code = _access_code
    AND is_active = true
  LIMIT 1;

  -- Code must exist and (case-insensitively) match the typed university name
  _valid := _code_uni IS NOT NULL
            AND lower(_code_uni) = lower(_university_name);

  IF NOT _valid THEN
    RETURN false;
  END IF;

  -- Ensure a universities row exists, then capture its id
  INSERT INTO public.universities (name)
  VALUES (_code_uni)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO _uni_id FROM public.universities WHERE name = _code_uni;

  -- Link the admin's profile to this university
  UPDATE public.profiles
     SET university    = _code_uni,
         university_id = _uni_id
   WHERE id = _user_id;

  -- Assign the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'university_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$function$;

-- 2. Collision-proof student access code generator
CREATE OR REPLACE FUNCTION public.generate_student_access_code(
  _university_id uuid, _university_name text, _created_by uuid, _label text DEFAULT 'Onboarding default'
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _slug text;
  _code text;
  _attempt int := 0;
BEGIN
  -- Caller must be the university admin for that university (or a global admin)
  IF NOT (
    public.has_role(_created_by, 'admin'::app_role)
    OR (
      public.has_role(_created_by, 'university_admin'::app_role)
      AND public.get_user_university_id(_created_by) = _university_id
    )
  ) THEN
    RAISE EXCEPTION 'Not authorised to generate codes for this university';
  END IF;

  _slug := upper(regexp_replace(coalesce(_university_name, 'UNI'), '[^A-Za-z]+', '', 'g'));
  IF length(_slug) < 3 THEN _slug := 'UNI'; END IF;
  _slug := substr(_slug, 1, 5);

  LOOP
    _code := _slug || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    BEGIN
      INSERT INTO public.cohort_invite_codes (
        university_id, university_name, code, label, created_by
      ) VALUES (
        _university_id, _university_name, _code, _label, _created_by
      );
      RETURN _code;
    EXCEPTION WHEN unique_violation THEN
      _attempt := _attempt + 1;
      IF _attempt > 8 THEN
        RAISE EXCEPTION 'Could not generate a unique access code after 8 attempts';
      END IF;
    END;
  END LOOP;
END;
$function$;
