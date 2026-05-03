CREATE TABLE IF NOT EXISTS public.professor_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  email text NOT NULL,
  courses text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, email)
);

ALTER TABLE public.professor_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global admins manage all professor invites"
  ON public.professor_invites FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Uni admins manage own professor invites"
  ON public.professor_invites FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'university_admin'::app_role)
         AND university_id = get_user_university_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'university_admin'::app_role)
              AND university_id = get_user_university_id(auth.uid())
              AND invited_by = auth.uid());
