
-- Fix security definer view by recreating with security_invoker
CREATE OR REPLACE VIEW public.leaderboard WITH (security_invoker = true) AS
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
