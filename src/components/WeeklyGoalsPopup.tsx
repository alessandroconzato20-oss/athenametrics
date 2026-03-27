import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Sparkles, Plus, X, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, format } from "date-fns";

interface WeeklyGoalsPopupProps {
  open: boolean;
  onClose: () => void;
  onGoalsConfirmed: (dailyBreakdown: Record<string, string[]>) => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}! ☀️`;
  if (hour < 17) return `Good afternoon, ${name}! 🌤️`;
  return `Good evening, ${name}! 🌙`;
}

const WeeklyGoalsPopup = ({ open, onClose, onGoalsConfirmed }: WeeklyGoalsPopupProps) => {
  const { user, displayName } = useAuth();
  const [step, setStep] = useState<"goals" | "breakdown" | "saving">("goals");
  const [goals, setGoals] = useState<string[]>([""]);
  const [dailyBreakdown, setDailyBreakdown] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const addGoal = () => {
    if (goals.length < 7) setGoals([...goals, ""]);
  };

  const updateGoal = (idx: number, val: string) => {
    setGoals(prev => prev.map((g, i) => (i === idx ? val : g)));
  };

  const removeGoal = (idx: number) => {
    if (goals.length > 1) setGoals(prev => prev.filter((_, i) => i !== idx));
  };

  const generateBreakdown = async () => {
    const validGoals = goals.filter(g => g.trim());
    if (validGoals.length === 0) return;

    setLoading(true);
    try {
      // Simple even distribution as fallback / default
      const breakdown: Record<string, string[]> = {};
      DAYS.forEach(day => { breakdown[day] = []; });

      // Distribute goals across the week
      validGoals.forEach((goal, i) => {
        // Spread each goal across ~3 days
        const startDay = i % 7;
        const daysForGoal = Math.min(3, 7 - startDay);
        for (let d = 0; d < daysForGoal; d++) {
          const dayIdx = (startDay + d) % 7;
          breakdown[DAYS[dayIdx]].push(goal);
        }
      });

      // Remove days with no tasks
      DAYS.forEach(day => {
        if (breakdown[day].length === 0) {
          breakdown[day] = ["Rest & recover 🌿"];
        }
      });

      setDailyBreakdown(breakdown);
      setStep("breakdown");
    } finally {
      setLoading(false);
    }
  };

  const confirmAndSave = async () => {
    if (!user) return;
    setStep("saving");

    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const validGoals = goals.filter(g => g.trim());

    const { error } = await supabase.from("weekly_goals" as any).upsert(
      {
        user_id: user.id,
        week_start: weekStart,
        goals: validGoals,
        daily_breakdown: dailyBreakdown,
        status: "active",
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id,week_start" }
    );

    if (error) {
      console.error("Failed to save weekly goals:", error);
    }

    onGoalsConfirmed(dailyBreakdown);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-elevated"
          >
            {/* Close button */}
            <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>

            {step === "goals" && (
              <div>
                {/* Personalized greeting */}
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">{getGreeting(displayName)}</h2>
                    <p className="text-xs text-muted-foreground">New week, new goals! What do you want to achieve?</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  {goals.map((goal, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <Input
                        value={goal}
                        onChange={e => updateGoal(i, e.target.value)}
                        placeholder={`Goal ${i + 1}...`}
                        className="rounded-xl border-muted bg-muted/50 text-sm"
                      />
                      {goals.length > 1 && (
                        <button onClick={() => removeGoal(i)} className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>

                {goals.length < 7 && (
                  <button onClick={addGoal} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                    <Plus className="h-3 w-3" /> Add another goal
                  </button>
                )}

                <Button
                  onClick={generateBreakdown}
                  disabled={loading || goals.every(g => !g.trim())}
                  className="mt-5 w-full rounded-xl bg-gradient-primary font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 animate-spin" /> Breaking down...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Break down into daily tasks <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            )}

            {step === "breakdown" && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-foreground">Your Weekly Breakdown</h2>
                    <p className="text-xs text-muted-foreground">Does this look good? We'll add today's tasks to your plan.</p>
                  </div>
                </div>

                <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                  {DAYS.map((day, di) => {
                    const today = format(new Date(), "EEEE");
                    const isToday = day === today;
                    return (
                      <motion.div
                        key={day}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: di * 0.04 }}
                        className={`rounded-xl p-3 ${isToday ? "bg-primary/10 ring-1 ring-primary/20" : "bg-muted/50"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{day}</span>
                          {isToday && (
                            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">TODAY</span>
                          )}
                        </div>
                        <ul className="mt-1.5 space-y-1">
                          {(dailyBreakdown[day] || []).map((task, ti) => (
                            <li key={ti} className="flex items-start gap-1.5 text-sm text-foreground">
                              <span className="mt-0.5 text-primary">•</span>
                              {task}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button onClick={() => setStep("goals")} variant="outline" className="flex-1 rounded-xl">
                    Edit Goals
                  </Button>
                  <Button onClick={confirmAndSave} className="flex-1 rounded-xl bg-gradient-primary font-semibold">
                    <Check className="h-4 w-4" /> Looks good!
                  </Button>
                </div>
              </div>
            )}

            {step === "saving" && (
              <div className="flex flex-col items-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Sparkles className="h-8 w-8 text-primary" />
                </motion.div>
                <p className="mt-3 text-sm font-medium text-muted-foreground">Saving your goals...</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WeeklyGoalsPopup;
