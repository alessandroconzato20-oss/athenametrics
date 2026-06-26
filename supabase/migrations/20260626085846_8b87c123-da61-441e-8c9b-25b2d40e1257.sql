ALTER TABLE public.daily_wellbeing_checkins
  ADD COLUMN IF NOT EXISTS emotional_exhaustion integer
  CHECK (emotional_exhaustion IS NULL OR emotional_exhaustion BETWEEN 1 AND 5);
COMMENT ON COLUMN public.daily_wellbeing_checkins.emotional_exhaustion IS
  'Single-item MBI-SS exhaustion proxy (1=not at all, 5=completely drained). Drives Burnout Risk multiplier in checkinModifiers.';