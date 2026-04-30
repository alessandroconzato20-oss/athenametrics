import { useState, useEffect } from "react";
import { QUICK_REPLY_KEY } from "@/services/notifications";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface DetectedWorkoutLite {
  category: "cardio" | "strength" | "walking";
  durationMinutes: number;
  rawName?: string;
}

interface DailyWellbeingCheckinProps {
  open: boolean;
  onClose: () => void;
  /**
   * If provided, skip Q5 entirely and persist this workout instead.
   * Sourced from HealthKit HKWorkoutType (Apple Watch / fitness apps).
   */
  detectedWorkout?: DetectedWorkoutLite | null;
}

const REST_OPTIONS = [
  { value: 1, emoji: "😴", label: "Exhausted" },
  { value: 2, emoji: "😐", label: "Tired" },
  { value: 3, emoji: "🙂", label: "Okay" },
  { value: 4, emoji: "😊", label: "Rested" },
  { value: 5, emoji: "⚡", label: "Great" },
];

const STUDY_WINDOW_OPTIONS: { value: "within_30" | "1_2h" | "3plus" | "not_today"; emoji: string; label: string }[] = [
  { value: "within_30", emoji: "⏱️", label: "Within 30 min" },
  { value: "1_2h",      emoji: "🕐", label: "1–2 hours" },
  { value: "3plus",     emoji: "🕒", label: "3+ hours" },
  { value: "not_today", emoji: "🚫", label: "Not today" },
];

const STRESS_OPTIONS = [
  { value: 1, emoji: "😌", label: "Calm" },
  { value: 2, emoji: "😕", label: "Mild" },
  { value: 3, emoji: "😟", label: "Stressed" },
  { value: 4, emoji: "😰", label: "Very Stressed" },
];

const MOTIVATION_OPTIONS = [
  { value: 1, emoji: "🚫", label: "Not at all" },
  { value: 2, emoji: "😑", label: "Low" },
  { value: 3, emoji: "😐", label: "Average" },
  { value: 4, emoji: "💪", label: "Motivated" },
  { value: 5, emoji: "🔥", label: "Very motivated" },
];

const NIGHT_FACTORS = [
  { id: "alcohol", emoji: "🍺", label: "Alcohol" },
  { id: "caffeine", emoji: "☕", label: "Late caffeine" },
  { id: "screen", emoji: "📱", label: "Late screen time" },
  { id: "stress", emoji: "😰", label: "Stress / couldn't switch off" },
  { id: "unwell", emoji: "🤒", label: "Feeling unwell" },
  { id: "normal", emoji: "✅", label: "Normal night" },
];

const EXERCISE_TYPES: { value: "cardio" | "strength" | "walking"; emoji: string; label: string }[] = [
  { value: "cardio",   emoji: "🏃", label: "Cardio" },
  { value: "strength", emoji: "🏋️", label: "Strength" },
  { value: "walking",  emoji: "🚶", label: "Walking" },
];

const EXERCISE_DURATIONS = [15, 30, 45, 60, 90];

// 6 steps: rest, study-window, stress, motivation, night-factors, exercise
type Step = 0 | 1 | 2 | 3 | 4 | 5;
type StudyWindow = "within_30" | "1_2h" | "3plus" | "not_today";
type ExerciseType = "cardio" | "strength" | "walking";

const DailyWellbeingCheckin = ({ open, onClose, detectedWorkout }: DailyWellbeingCheckinProps) => {
  const { user, universityId } = useAuth();
  const hasDetectedWorkout = !!detectedWorkout;
  // When HealthKit has already given us a workout, the exercise step (5) is skipped.
  const lastStep: Step = hasDetectedWorkout ? 4 : 5;
  const totalSteps = hasDetectedWorkout ? 5 : 6;
  const [step, setStep] = useState<Step>(0);
  const [rest, setRest] = useState<number | null>(null);
  const [studyWindow, setStudyWindow] = useState<StudyWindow | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [nightFactors, setNightFactors] = useState<string[]>([]);
  // null = unanswered, true = yes, false = no, "not_yet" = haven't yet (treated as no for scoring)
  const [didExercise, setDidExercise] = useState<boolean | "not_yet" | null>(null);
  const [exerciseType, setExerciseType] = useState<ExerciseType | null>(null);
  const [exerciseDuration, setExerciseDuration] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleNightFactor = (id: string) => {
    if (id === "normal") {
      setNightFactors(prev => prev.includes("normal") ? prev.filter(f => f !== "normal") : ["normal"]);
      return;
    }
    setNightFactors(prev => {
      const without = prev.filter(f => f !== "normal");
      return without.includes(id) ? without.filter(f => f !== id) : [...without, id];
    });
  };

  const handleNext = async () => {
    if (step < lastStep) {
      setStep((step + 1) as Step);
      return;
    }
    if (!user || rest === null || stress === null || motivation === null || studyWindow === null) return;
    // Resolve exercise: prefer HealthKit-detected workout; fall back to user input.
    // Resolve exercise: prefer HealthKit-detected workout; fall back to user input.
    // "not_yet" is treated as no exercise for today's score (same as false).
    const exerciseTrue = didExercise === true;
    const finalDidExercise = hasDetectedWorkout ? true : (didExercise === null ? null : exerciseTrue);
    const finalExerciseType = hasDetectedWorkout ? detectedWorkout!.category : (exerciseTrue ? exerciseType : null);
    const finalExerciseDuration = hasDetectedWorkout ? detectedWorkout!.durationMinutes : (exerciseTrue ? exerciseDuration : null);
    if (finalDidExercise === null) return;
    setSaving(true);
    const { error } = await supabase
      .from("daily_wellbeing_checkins" as any)
      .upsert({
        user_id: user.id,
        university_id: universityId,
        checkin_date: new Date().toISOString().split("T")[0],
        rest_level: rest,
        stress_level: stress,
        motivation_level: motivation,
        night_factors: nightFactors,
        study_plan_window: studyWindow,
        did_exercise: finalDidExercise,
        exercise_type: finalDidExercise ? finalExerciseType : null,
        exercise_duration_minutes: finalDidExercise ? finalExerciseDuration : null,
      } as any, { onConflict: "user_id,checkin_date" } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    onClose();
  };

  const canProceed = () => {
    if (step === 0) return rest !== null;
    if (step === 1) return studyWindow !== null;
    if (step === 2) return stress !== null;
    if (step === 3) return motivation !== null;
    if (step === 4) return nightFactors.length > 0;
    if (step === 5) {
      // Only reachable when no HealthKit workout was detected
      if (didExercise === null) return false;
      if (didExercise === false || didExercise === "not_yet") return true;
      return exerciseType !== null && exerciseDuration !== null;
    }
    return false;
  };

  const SIMPLE_STEPS = [
    { question: "How rested do you feel right now?", options: REST_OPTIONS, selected: rest, onSelect: setRest },
    null, // step 1 — study window (custom)
    { question: "How stressed or anxious do you feel? (study & non-study related)", options: STRESS_OPTIONS, selected: stress, onSelect: setStress },
    { question: "How motivated do you feel to study today?", options: MOTIVATION_OPTIONS, selected: motivation, onSelect: setMotivation },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden border-none [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">Daily Wellbeing Check-in</DialogTitle>
        {step === 0 && (
          <p className="px-5 pt-5 pb-1 text-sm text-muted-foreground">
            Quick daily check-in — your answers shape your Cognitive Readiness, Study Capacity, Burnout Risk and Retention Outlook so your metrics reflect how you actually feel.
          </p>
        )}
        <div className="flex gap-1 px-5 pt-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="px-5 pb-5 pt-3"
          >
            {/* Steps 0, 2, 3 — simple single-select */}
            {(step === 0 || step === 2 || step === 3) && (() => {
              const cfg = SIMPLE_STEPS[step]!;
              return (
                <>
                  <p className="text-base font-semibold text-foreground mb-4">{cfg.question}</p>
                  <div className="flex flex-col gap-2">
                    {cfg.options.map(opt => {
                      const isSelected = cfg.selected === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => cfg.onSelect(opt.value)}
                          className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all border text-left
                            ${isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                            }`}
                        >
                          <span className="text-lg shrink-0">{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            {/* Step 1 — study plan window */}
            {step === 1 && (
              <>
                <p className="text-base font-semibold text-foreground mb-4">When do you plan to start studying today?</p>
                <div className="flex flex-col gap-2">
                  {STUDY_WINDOW_OPTIONS.map(opt => {
                    const isSelected = studyWindow === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setStudyWindow(opt.value)}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all border text-left
                          ${isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                      >
                        <span className="text-lg shrink-0">{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Step 4 — night factors */}
            {step === 4 && (
              <>
                <p className="text-base font-semibold text-foreground mb-1">Did anything affect your night?</p>
                <p className="text-xs text-muted-foreground mb-4">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {NIGHT_FACTORS.map(opt => {
                    const isSelected = nightFactors.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleNightFactor(opt.id)}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all border
                          ${isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                      >
                        <span className="text-lg">{opt.emoji}</span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Step 5 — exercise */}
            {step === 5 && (
              <>
                <p className="text-base font-semibold text-foreground mb-4">Did you exercise today?</p>
                <div className="flex flex-col gap-2 mb-4">
                  {[
                    { v: true as const,      emoji: "💪", label: "Yes" },
                    { v: "not_yet" as const, emoji: "⏳", label: "Not yet — might later" },
                    { v: false as const,     emoji: "🚫", label: "No" },
                  ].map(opt => {
                    const isSelected = didExercise === opt.v;
                    return (
                      <button
                        key={String(opt.v)}
                        onClick={() => {
                          setDidExercise(opt.v);
                          if (opt.v !== true) {
                            setExerciseType(null);
                            setExerciseDuration(null);
                          }
                        }}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all border text-left
                          ${isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                      >
                        <span className="text-lg">{opt.emoji}</span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {didExercise === true && (
                  <>
                    <p className="text-sm font-semibold text-foreground mb-2">Type</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {EXERCISE_TYPES.map(opt => {
                        const isSelected = exerciseType === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setExerciseType(opt.value)}
                            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all border
                              ${isSelected
                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40"
                              }`}
                          >
                            <span className="text-lg">{opt.emoji}</span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-sm font-semibold text-foreground mb-2">Duration</p>
                    <div className="flex flex-wrap gap-2">
                      {EXERCISE_DURATIONS.map(min => {
                        const isSelected = exerciseDuration === min;
                        return (
                          <button
                            key={min}
                            onClick={() => setExerciseDuration(min)}
                            className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all border
                              ${isSelected
                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40"
                              }`}
                          >
                            {min} min
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            <div className="mt-5 flex gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setStep((step - 1) as Step)}>
                  Back
                </Button>
              )}
              <Button
                size="sm"
                className="rounded-full flex-1"
                disabled={!canProceed() || saving}
                onClick={handleNext}
              >
                {saving ? "Saving…" : step === lastStep ? "Done" : "Next"}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default DailyWellbeingCheckin;
