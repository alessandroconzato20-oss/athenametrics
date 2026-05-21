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
// Adapted: "work" → "study" so it reads naturally for students.
type Step = {
  id: string;
  question: string;
  helper?: string;
  type: "yesno" | "time" | "daysPerWeek";
};

const steps: Step[] = [
  {
    id: "shift_worker",
    question: "Have you been a shift- or night-worker in the past three months?",
    helper: "Includes overnight hospital shifts, night jobs, or rotating schedules.",
    type: "yesno",
  },
  {
    id: "study_days",
    question: "Normally, how many days per week do you have a fixed study/class schedule?",
    helper: "Days where you wake up to an alarm for lectures, placements, or planned study.",
    type: "daysPerWeek",
  },
  {
    id: "wd_sleep",
    question: "On STUDY days … I normally fall asleep at:",
    helper: "Not when you get into bed — when you actually drift off.",
    type: "time",
  },
  {
    id: "wd_wake",
    question: "On STUDY days … I normally wake up at:",
    helper: "Not when you get out of bed — when you actually wake.",
    type: "time",
  },
  {
    id: "fd_sleep",
    question: "On STUDY-FREE days (no alarm) … I normally fall asleep at:",
    helper: "Days with no obligations and no alarm clock.",
    type: "time",
  },
  {
    id: "fd_wake",
    question: "On STUDY-FREE days (no alarm) … I normally wake up at:",
    helper: "Estimate an average over the past 6 weeks.",
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

  const studyDays = Math.min(7, Math.max(0, parseInt(answers.study_days || "5", 10)));
  const freeDays = 7 - studyDays;

  const sdW = dur(wdSleep, wdWake);
  const sdF = dur(fdSleep, fdWake);
  const sdWeek = (studyDays * sdW + freeDays * sdF) / 7;

  let msf = fdSleep + sdF / 2;
  if (msf >= 24 * 60) msf -= 24 * 60;

  let msfsc = msf;
  if (sdF > sdWeek) {
    msfsc = msf - (sdF - sdWeek) / 2;
    if (msfsc < 0) msfsc += 24 * 60;
  }

  const hours = msfsc / 60;
  let chronotype: "extreme_early" | "early" | "intermediate" | "late" | "extreme_late";
  if (hours < 2) chronotype = "extreme_early";
  else if (hours < 3.5) chronotype = "early";
  else if (hours < 5) chronotype = "intermediate";
  else if (hours < 6.5) chronotype = "late";
  else chronotype = "extreme_late";

  return {
    msfsc_minutes: Math.round(msfsc),
    msfsc_hours: +hours.toFixed(2),
    chronotype,
    sleep_debt_min: Math.max(0, Math.round(sdF - sdW)),
    study_days_per_week: studyDays,
  };
}

const ChronotypeQuiz = () => {
  const navigate = useNavigate();
  const { user, universityId } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // If shift worker = yes, MSFsc is not validly computable; we still record but flag it.
  // If 0 study days, skip the workday questions.
  const visibleSteps = answers.study_days === "0"
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
      if (filled.study_days === "0") {
        filled.wd_sleep = filled.fd_sleep;
        filled.wd_wake = filled.fd_wake;
      }
      const derived = computeMSFsc(filled);
      const { error } = await (supabase.from("student_quizzes" as any).upsert({
        user_id: user.id,
        university_id: universityId,
        quiz_key: "mctq_micro",
        results: { ...filled, ...derived, shift_worker_flag: filled.shift_worker === "yes" },
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

  const renderInput = () => {
    if (current.type === "yesno") {
      return (
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
      );
    }
    if (current.type === "daysPerWeek") {
      return (
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {[0, 1, 2, 3, 4, 5, 6, 7].map(n => (
            <motion.button
              key={n}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAnswers({ ...answers, [current.id]: String(n) })}
              className={`rounded-xl border py-3 text-base font-semibold transition-all ${
                answers[current.id] === String(n)
                  ? "border-primary bg-primary/10 text-foreground shadow-soft"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              {n}
            </motion.button>
          ))}
        </div>
      );
    }
    // time — native picker on iOS renders as a scroll wheel
    return (
      <Input
        type="time"
        value={answers[current.id] || ""}
        onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
        className="h-16 rounded-xl text-2xl font-semibold tracking-wide text-center mt-4"
      />
    );
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
          {step === 0 && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Please estimate an average of your normal sleep behaviour over the past 6 weeks.
            </p>
          )}
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
            {current.helper && <p className="text-xs text-muted-foreground mb-2">{current.helper}</p>}
            {renderInput()}
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
