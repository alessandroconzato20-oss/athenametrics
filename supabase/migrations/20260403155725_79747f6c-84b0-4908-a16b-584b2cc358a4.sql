
-- 1. Fix profiles: restrict SELECT to owner-only (admin policy already exists)
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Fix syllabi storage: restrict uploads to admin roles only
DROP POLICY IF EXISTS "Auth users can upload syllabi PDFs" ON storage.objects;

CREATE POLICY "University admins can upload syllabi PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'syllabi'
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin'::app_role, 'university_admin'::app_role)
      )
    )
  );

-- 3. Add DELETE policy on user_roles for admins
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix has_role function: add self-check guard
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;
