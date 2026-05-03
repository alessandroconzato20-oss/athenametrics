import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Wrench } from "lucide-react";
import { toast } from "sonner";

const TOTAL_STEPS = 6;

/**
 * University admin onboarding wizard.
 *
 * Phase 1: route + gating + scaffolding only. Steps 1–6 ship in Phase 2.
 * For now, this page lets the admin mark onboarding as complete so they can
 * reach the panel — useful for existing admins migrated mid-rollout.
 */
const UniversitySetup = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [stepCompleted, setStepCompleted] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/university-login");
      return;
    }
    (async () => {
      const { data: isUniAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "university_admin",
      });
      if (!isUniAdmin) {
        // Global admins skip onboarding; everyone else gets bounced.
        const { data: isGlobal } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        navigate(isGlobal ? "/admin" : "/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("university_id, onboarding_completed")
        .eq("id", user.id)
        .single<{ university_id: string | null; onboarding_completed: boolean | null }>();

      if (profile?.onboarding_completed) {
        navigate("/admin");
        return;
      }

      setUniversityId(profile?.university_id ?? null);

      if (profile?.university_id) {
        const { data: progress } = await supabase
          .from("university_onboarding_progress")
          .select("step_completed")
          .eq("university_id", profile.university_id)
          .maybeSingle();
        if (progress?.step_completed) setStepCompleted(progress.step_completed);
      }

      setChecking(false);
    })();
  }, [user, authLoading, navigate]);

  const completeOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save — please try again.");
      return;
    }
    toast.success("Setup complete.");
    navigate("/admin");
  };

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  const progressPct = Math.round((stepCompleted / TOTAL_STEPS) * 100);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {stepCompleted} of {TOTAL_STEPS}</span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="rounded-3xl border-2 border-primary/20">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary">
                <GraduationCap className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Welcome to Athena Metrics
              </h1>
              <p className="mt-2 text-muted-foreground">
                We're building you a guided setup wizard so a single programme handbook
                upload can configure your courses, calendar, and welfare contacts in
                under 15 minutes.
              </p>

              <div className="mt-6 rounded-2xl bg-muted/40 p-5 text-left">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Wrench className="h-4 w-4 text-primary" />
                  Coming next
                </div>
                <ol className="space-y-1 pl-5 text-sm text-muted-foreground list-decimal">
                  <li>Programme structure (PDF auto-extract)</li>
                  <li>Courses, topics & blocking exams</li>
                  <li>Academic calendar (.ics import)</li>
                  <li>Welfare escalation setup</li>
                  <li>Data governance acknowledgement</li>
                  <li>Student access code reveal</li>
                </ol>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Button
                  onClick={completeOnboarding}
                  disabled={saving}
                  className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground"
                >
                  {saving ? "Saving…" : "Skip wizard for now → Admin Panel"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  University id: {universityId ?? "not yet linked — please contact support"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default UniversitySetup;
