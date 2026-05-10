import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Moon } from "lucide-react";
import { toast } from "sonner";

// Micro Munich Chronotype Questionnaire (μMCTQ – Ghotbi et al., 2020)
type Step = {
  id: string;
  question: string;
  helper?: string;
  type: "yesno" | "time";
};

const steps: Step[] = [
  {
    id: "has_workdays",
    question: "Do you have a regular work / study schedule (e.g. classes or job on most weekdays)?",
    type: "yesno",
  },
  {
    id: "wd_sleep",
    question: "On WORK days, what time do you usually fall asleep?",
    helper: "Not the time you go to bed — when you actually drift off.",
    type: "time",
  },
  {
    id: "wd_wake",
    question: "On WORK days, what time do you usually wake up?",
    type: "time",
  },
  {
    id: "fd_sleep",
    question: "On FREE days, what time do you usually fall asleep?",
    helper: "Days with no obligations, no alarm.",
    type: "time",
  },
  {
    id: "fd_wake",
    question: "On FREE days, what time do you usually wake up (without an alarm)?",
    type: "time",
  },
];

// Compute MSFsc — sleep-corrected mid-sleep on free days (proxy for chronotype)
function computeMSFsc(answers: Record<string, string>) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const dur = (sleep: number, wake: number) => {
    let d = wake - sleep;
    if (d <= 0) d += 24 * 60;
    return d;
  };
  const wdSleep = toMin(answers.wd_sleep);
  const wdWake = toMin(answers.wd_wake);
  const fdSleep = toMin(answers.fd_sleep);
  const fdWake = toMin(answers.fd_wake);

  const sdW = dur(wdSleep, wdWake); // workday sleep duration
  const sdF = dur(fdSleep, fdWake); // free day sleep duration
  const sdWeek = (5 * sdW + 2 * sdF) / 7; // weekly average

  // Mid-sleep on free days
  let msf = fdSleep + sdF / 2;
  if (msf >= 24 * 60) msf -= 24 * 60;

  // Sleep-corrected MSF (only correct if sleeping more on free days)
  let msfsc = msf;
  if (sdF > sdWeek) {
    msfsc = msf - (sdF - sdWeek) / 2;
    if (msfsc < 0) msfsc += 24 * 60;
  }

  // Classify chronotype
  const hours = msfsc / 60;
  let chronotype: "extreme_early" | "early" | "intermediate" | "late" | "extreme_late";
  if (hours < 2) chronotype = "extreme_early";
  else if (hours < 3.5) chronotype = "early";
  else if (hours < 5) chronotype = "intermediate";
  else if (hours < 6.5) chronotype = "late";
  else chronotype = "extreme_late";

  return { msfsc_minutes: Math.round(msfsc), msfsc_hours: +hours.toFixed(2), chronotype, sleep_debt_min: Math.max(0, Math.round(sdF - sdW)) };
}

const ChronotypeQuiz = () => {
  const navigate = useNavigate();
  const { user, universityId } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Skip workday questions if no regular schedule
  const visibleSteps = answers.has_workdays === "no"
    ? steps.filter(s => !s.id.startsWith("wd_"))
    : steps;
  const current = visibleSteps[step];
  const progress = ((step + 1) / visibleSteps.length) * 100;

  const canProceed = () => {
    const v = answers[current.id];
    return !!v && v.length > 0;
  };

  const handleNext = async () => {
    if (step < visibleSteps.length - 1) {
      setStep(step + 1);
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const filled = { ...answers };
      // If no workdays, copy free-day values into workday slots so calc still works
      if (filled.has_workdays === "no") {
        filled.wd_sleep = filled.fd_sleep;
        filled.wd_wake = filled.fd_wake;
      }
      const derived = computeMSFsc(filled);
      const { error } = await (supabase.from("student_quizzes" as any).upsert({
        user_id: user.id,
        university_id: universityId,
        quiz_key: "mctq_micro",
        results: { ...filled, ...derived },
        completed_at: new Date().toISOString(),
      } as any, { onConflict: "user_id,quiz_key" }) as any);
      if (error) throw error;
      toast.success(`Chronotype: ${derived.chronotype.replace("_", " ")} 🌙`);
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary">
            <Moon className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Chronotype Quiz</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            μMCTQ · {step + 1} of {visibleSteps.length}
          </p>
        </motion.div>

        <Progress value={progress} className="mb-8 h-2 rounded-full" />

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-1">{current.question}</h2>
            {current.helper && <p className="text-xs text-muted-foreground mb-4">{current.helper}</p>}

            {current.type === "yesno" ? (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {["yes", "no"].map(opt => (
                  <motion.button
                    key={opt}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setAnswers({ ...answers, [current.id]: opt })}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold capitalize transition-all ${
                      answers[current.id] === opt
                        ? "border-primary bg-primary/10 text-foreground shadow-soft"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
            ) : (
              <Input
                type="time"
                value={answers[current.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
                className="h-14 rounded-xl text-lg mt-4"
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="h-12 rounded-xl px-6">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="h-12 flex-1 rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground"
          >
            {saving ? "Saving..." : step === visibleSteps.length - 1 ? "Finish" : "Continue"}
            {!saving && step < visibleSteps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default ChronotypeQuiz;
