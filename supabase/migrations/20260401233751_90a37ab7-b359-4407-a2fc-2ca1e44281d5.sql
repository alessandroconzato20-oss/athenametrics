
-- Drop any partial state from failed migration
DROP TABLE IF EXISTS public.library_members CASCADE;
DROP TABLE IF EXISTS public.study_libraries CASCADE;
DROP FUNCTION IF EXISTS public.is_library_member(UUID, UUID);
DROP FUNCTION IF EXISTS public.join_library_by_code(UUID, TEXT);

-- Create tables first, policies after
CREATE TABLE public.study_libraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.library_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  library_id UUID NOT NULL REFERENCES public.study_libraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (library_id, user_id)
);

ALTER TABLE public.study_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check membership without recursion
CREATE OR REPLACE FUNCTION public.is_library_member(_user_id UUID, _library_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.library_members
    WHERE user_id = _user_id AND library_id = _library_id
  )
$$;

-- Join by invite code (security definer so user doesn't need SELECT on study_libraries)
CREATE OR REPLACE FUNCTION public.join_library_by_code(_user_id UUID, _invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _library_id UUID;
BEGIN
  SELECT id INTO _library_id FROM public.study_libraries WHERE invite_code = _invite_code;
  IF _library_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.library_members (library_id, user_id)
  VALUES (_library_id, _user_id)
  ON CONFLICT (library_id, user_id) DO NOTHING;
  RETURN _library_id;
END;
$$;

-- study_libraries policies
CREATE POLICY "Members can view their libraries" ON public.study_libraries
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_library_member(auth.uid(), id));

CREATE POLICY "Users can create libraries" ON public.study_libraries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update library" ON public.study_libraries
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete library" ON public.study_libraries
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- library_members policies
CREATE POLICY "Members can view library members" ON public.library_members
  FOR SELECT TO authenticated
  USING (is_library_member(auth.uid(), library_id));

CREATE POLICY "Users can join libraries" ON public.library_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave libraries" ON public.library_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
