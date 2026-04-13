
-- Table for per-user weekly rotating login keys
CREATE TABLE public.university_login_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  login_key TEXT NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(login_key),
  UNIQUE(user_id)
);

ALTER TABLE public.university_login_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login key"
  ON public.university_login_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all login keys"
  ON public.university_login_keys FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage keys"
  ON public.university_login_keys FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate a random 8-char key
CREATE OR REPLACE FUNCTION public.generate_login_key_for_user(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key TEXT;
BEGIN
  _key := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  
  INSERT INTO public.university_login_keys (user_id, login_key, valid_from, valid_until)
  VALUES (_user_id, _key, now(), now() + interval '7 days')
  ON CONFLICT (user_id) DO UPDATE SET
    login_key = _key,
    valid_from = now(),
    valid_until = now() + interval '7 days',
    created_at = now();
  
  RETURN _key;
END;
$$;

-- Function to rotate all university admin keys
CREATE OR REPLACE FUNCTION public.rotate_all_login_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin RECORD;
BEGIN
  FOR _admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'university_admin'
  LOOP
    PERFORM generate_login_key_for_user(_admin.user_id);
  END LOOP;
END;
$$;

-- Function to look up user email by valid login key
CREATE OR REPLACE FUNCTION public.lookup_email_by_login_key(_login_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
  _uid UUID;
BEGIN
  SELECT user_id INTO _uid
  FROM public.university_login_keys
  WHERE login_key = _login_key
    AND now() BETWEEN valid_from AND valid_until;
  
  IF _uid IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  RETURN _email;
END;
$$;

-- Trigger: auto-generate key when university_admin role is assigned
CREATE OR REPLACE FUNCTION public.auto_generate_login_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'university_admin' THEN
    PERFORM generate_login_key_for_user(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_generate_login_key
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_login_key();
