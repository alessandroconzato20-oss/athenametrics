
-- Profiles table for leaderboard usernames
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read profiles (for leaderboard)
CREATE POLICY "Anyone authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- View for leaderboard: aggregate study stats per user
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id AS user_id,
  p.username,
  COALESCE(SUM(sl.duration_minutes), 0)::integer AS total_minutes,
  COUNT(sl.id)::integer AS total_sessions,
  COUNT(DISTINCT sl.subject)::integer AS subjects_studied,
  COALESCE(MAX(sl.studied_at), p.created_at) AS last_active
FROM public.profiles p
LEFT JOIN public.study_logs sl ON sl.user_id = p.id
GROUP BY p.id, p.username, p.created_at
ORDER BY total_minutes DESC;
