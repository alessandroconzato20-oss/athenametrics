import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface DailyWellbeingCheckinProps {
  open: boolean;
  onClose: () => void;
}

const REST_OPTIONS = [
  { value: 1, emoji: "😴", label: "Exhausted", effect: "Cognitive Readiness ↓↓ · Study Capacity ↓↓ · Retention ↓↓" },
  { value: 2, emoji: "😐", label: "Tired", effect: "Moderate drop across all metrics" },
  { value: 3, emoji: "🙂", label: "Okay", effect: "Neutral — we'll lean on your health data" },
  { value: 4, emoji: "😊", label: "Rested", effect: "Slight boost to Readiness & Capacity" },
  { value: 5, emoji: "⚡", label: "Great", effect: "Slight boost to Readiness & Capacity" },
];

const STRESS_OPTIONS = [
  { value: 1, emoji: "😌", label: "Calm", effect: "Burnout Risk ↓ · Cognitive Readiness ↑" },
  { value: 2, emoji: "😕", label: "Mild", effect: "Slight increase to Burnout Risk" },
  { value: 3, emoji: "😟", label: "Stressed", effect: "Burnout Risk ↑ · Cognitive Readiness ↓" },
  { value: 4, emoji: "😰", label: "Very Stressed", effect: "Burnout Risk ↑↑ · Cognitive Readiness ↓↓" },
];

const MOTIVATION_OPTIONS = [
  { value: 1, emoji: "🚫", label: "Not at all", effect: "Study Capacity ↓↓ · Burnout Risk ↑" },
  { value: 2, emoji: "😑", label: "Low", effect: "Study Capacity ↓ · slight Burnout flag" },
  { value: 3, emoji: "😐", label: "Average", effect: "Neutral — no adjustment" },
  { value: 4, emoji: "💪", label: "Motivated", effect: "Study Capacity ↑" },
  { value: 5, emoji: "🔥", label: "Very motivated", effect: "Study Capacity ↑ · Retention ↑" },
];

const NIGHT_FACTORS = [
  { id: "alcohol", emoji: "🍺", label: "Alcohol" },
  { id: "caffeine", emoji: "☕", label: "Late caffeine" },
  { id: "screen", emoji: "📱", label: "Late screen time" },
  { id: "stress", emoji: "😰", label: "Stress / couldn't switch off" },
  { id: "unwell", emoji: "🤒", label: "Feeling unwell" },
  { id: "normal", emoji: "✅", label: "Normal night" },
];

type Step = 0 | 1 | 2 | 3;

const DailyWellbeingCheckin = ({ open, onClose }: DailyWellbeingCheckinProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(0);
  const [rest, setRest] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [nightFactors, setNightFactors] = useState<string[]>([]);
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
    if (step < 3) {
      setStep((step + 1) as Step);
      return;
    }
    // Save
    if (!user || rest === null || stress === null || motivation === null) return;
    setSaving(true);
    const { error } = await supabase
      .from("daily_wellbeing_checkins" as any)
      .upsert({
        user_id: user.id,
        checkin_date: new Date().toISOString().split("T")[0],
        rest_level: rest,
        stress_level: stress,
        motivation_level: motivation,
        night_factors: nightFactors,
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
    if (step === 1) return stress !== null;
    if (step === 2) return motivation !== null;
    if (step === 3) return nightFactors.length > 0;
    return false;
  };

  const STEPS = [
    {
      question: "How rested do you feel right now?",
      options: REST_OPTIONS,
      selected: rest,
      onSelect: setRest,
    },
    {
      question: "How stressed or anxious do you feel?",
      options: STRESS_OPTIONS,
      selected: stress,
      onSelect: setStress,
    },
    {
      question: "How motivated do you feel to study today?",
      options: MOTIVATION_OPTIONS,
      selected: motivation,
      onSelect: setMotivation,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden border-none [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">Daily Wellbeing Check-in</DialogTitle>
        {/* Progress bar */}
        <div className="flex gap-1 px-5 pt-5">
          {[0, 1, 2, 3].map(i => (
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
            {step < 3 ? (
              <>
                <p className="text-base font-semibold text-foreground mb-4">
                  {STEPS[step].question}
                </p>
                <div className="flex flex-wrap gap-2">
                  {STEPS[step].options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => STEPS[step].onSelect(opt.value)}
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all border
                        ${STEPS[step].selected === opt.value
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        }`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-foreground mb-1">
                  Did anything affect your night?
                </p>
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
                {saving ? "Saving…" : step === 3 ? "Done" : "Next"}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default DailyWellbeingCheckin;
