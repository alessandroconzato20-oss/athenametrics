import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Sparkles, Plus, X, ChevronRight, Check, RefreshCcw, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, format } from "date-fns";
import { useStudentCourses } from "@/hooks/useStudentCourses";

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

function getMotivationalSubtext(): string {
  const lines = [
    "Let's set you up for a productive week 💪",
    "A new week — a fresh start to crush it 🚀",
    "Plan smart, study smarter this week ✨",
    "What will you conquer this week? 🎯",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

const WeeklyGoalsPopup = ({ open, onClose, onGoalsConfirmed }: WeeklyGoalsPopupProps) => {
  const { user, displayName } = useAuth();
  const [step, setStep] = useState<"loading" | "focus" | "goals" | "breakdown" | "saving">("loading");
  const [suggestedGoals, setSuggestedGoals] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<Set<number>>(new Set());
  const [customGoal, setCustomGoal] = useState("");
  const [dailyBreakdown, setDailyBreakdown] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [subjectFocus, setSubjectFocus] = useState<Record<string, number>>({});

  const userYear = user?.user_metadata?.year || 1;
  const { courses: yearCourses } = useStudentCourses();

  // Initialize subject focus evenly
  useEffect(() => {
    if (yearCourses.length > 0 && Object.keys(subjectFocus).length === 0) {
      const even = Math.round(100 / yearCourses.length);
      const initial: Record<string, number> = {};
      yearCourses.forEach((c, i) => {
        initial[c.name] = i === yearCourses.length - 1 ? 100 - even * (yearCourses.length - 1) : even;
      });
      setSubjectFocus(initial);
    }
  }, [yearCourses]);

  // Normalize percentages when one slider changes
  const handleFocusChange = (subjectName: string, newValue: number) => {
    const others = Object.keys(subjectFocus).filter(k => k !== subjectName);
    const oldOthersTotal = others.reduce((s, k) => s + subjectFocus[k], 0);
    const remaining = 100 - newValue;

    const updated: Record<string, number> = { ...subjectFocus, [subjectName]: newValue };

    if (oldOthersTotal === 0) {
      // Distribute remaining evenly
      others.forEach(k => { updated[k] = Math.round(remaining / others.length); });
    } else {
      // Scale others proportionally
      others.forEach(k => {
        updated[k] = Math.round((subjectFocus[k] / oldOthersTotal) * remaining);
      });
    }

    // Fix rounding errors
    const total = Object.values(updated).reduce((s, v) => s + v, 0);
    if (total !== 100 && others.length > 0) {
      updated[others[0]] += 100 - total;
    }

    setSubjectFocus(updated);
  };

  useEffect(() => {
    if (!open || !user) return;
    setStep("loading");
    // Short delay then show focus step
    const t = setTimeout(() => setStep("focus"), 600);
    return () => clearTimeout(t);
  }, [open, user]);

  const generateSuggestions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [masteryRes, personaRes, logsRes] = await Promise.all([
        supabase
          .from("topic_mastery")
          .select("course_name, topic_name, status")
          .eq("user_id", user.id) as any,
        supabase
          .from("student_personas")
          .select("biggest_challenge, goals, stress_management, preferred_session_length")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("study_logs")
          .select("subject, duration_minutes")
          .eq("user_id", user.id)
          .order("studied_at", { ascending: false })
          .limit(30),
      ]);

      const mastery = (masteryRes.data || []) as Array<{ course_name: string; topic_name: string; status: string }>;
      const persona = personaRes.data;
      const logs = logsRes.data || [];

      const redCount = mastery.filter(m => m.status === "red").length;
      const orangeCount = mastery.filter(m => m.status === "orange").length;
      const totalMinutes = logs.reduce((sum: number, l: any) => sum + l.duration_minutes, 0);

      const suggestions: string[] = [];

      if (redCount > 0) {
        suggestions.push(`Focus on your weakest topics this week (${redCount} topics need attention) 🔴`);
      }
      if (orangeCount > 0) {
        suggestions.push("Revise and solidify topics you're not fully confident on 🟠");
      }
      suggestions.push("Complete 3 active recall sessions on your hardest material 🧠");
      if (totalMinutes < 300) {
        suggestions.push("Aim for at least 1 hour of focused study per day 📚");
      } else {
        suggestions.push("Maintain your study momentum — keep consistent daily sessions 📚");
      }

      suggestions.push("Exercise or walk for 30 min at least 4 days this week 🏃");
      suggestions.push("Take a 10-min walk between every study block 🌳");

      if (persona?.stress_management === "exercise") {
        suggestions.push("Hit the gym or do a workout 3 times this week 💪");
      } else if (persona?.stress_management === "meditation") {
        suggestions.push("10-min mindfulness session before studying each day 🧘");
      } else {
        suggestions.push("Stay hydrated — drink 2L of water daily 💧");
      }

      suggestions.push("Get 7+ hours of sleep every night this week 😴");

      const finalSuggestions = suggestions.slice(0, 7);
      setSuggestedGoals(finalSuggestions);
      setSelectedGoals(new Set(finalSuggestions.map((_, i) => i)));
      setStep("goals");
    } catch (e) {
      console.error("Failed to generate suggestions:", e);
      const fallback = [
        "Review weakest subject topics 📖",
        "Complete 3 active recall sessions 🧠",
        "Exercise 30 min × 4 days 🏃",
        "Walk between study blocks 🌳",
        "Sleep 7+ hours nightly 😴",
      ];
      setSuggestedGoals(fallback);
      setSelectedGoals(new Set(fallback.map((_, i) => i)));
      setStep("goals");
    } finally {
      setLoading(false);
    }
  };

  const toggleGoal = (idx: number) => {
    setSelectedGoals(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const addCustomGoal = () => {
    if (customGoal.trim()) {
      setSuggestedGoals(prev => [...prev, customGoal.trim()]);
      setSelectedGoals(prev => new Set([...prev, suggestedGoals.length]));
      setCustomGoal("");
    }
  };

  const getSelectedGoalTexts = () => {
    return suggestedGoals.filter((_, i) => selectedGoals.has(i));
  };

  const generateBreakdown = async () => {
    const validGoals = getSelectedGoalTexts();
    if (validGoals.length === 0) return;

    setLoading(true);
    try {
      const breakdown: Record<string, string[]> = {};
      DAYS.forEach(day => { breakdown[day] = []; });

      // Add subject focus as daily study tasks based on percentages
      const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      const sortedSubjects = Object.entries(subjectFocus)
        .filter(([, pct]) => pct > 0)
        .sort((a, b) => b[1] - a[1]);

      // Map subjects to weekdays weighted by focus percentage
      if (sortedSubjects.length > 0) {
        // Total weekday slots = 5
        sortedSubjects.forEach(([subject, pct]) => {
          const daysCount = Math.max(1, Math.round((pct / 100) * 5));
          const label = `📖 Study ${subject} (${pct}% focus)`;
          for (let d = 0; d < daysCount && d < 5; d++) {
            const dayIdx = d % 5;
            if (!breakdown[weekdays[dayIdx]].includes(label)) {
              breakdown[weekdays[dayIdx]].push(label);
            }
          }
        });
      }

      const studyGoals = validGoals.filter(g =>
        !g.match(/exercise|walk|gym|workout|sleep|hydrat|water|mindful|meditat/i)
      );
      const wellnessGoals = validGoals.filter(g =>
        g.match(/exercise|walk|gym|workout|sleep|hydrat|water|mindful|meditat/i)
      );

      studyGoals.forEach((goal, i) => {
        const start = i % 5;
        const spread = Math.min(3, studyGoals.length <= 3 ? 3 : 2);
        for (let d = 0; d < spread; d++) {
          const dayIdx = (start + d * 2) % 5;
          if (!breakdown[weekdays[dayIdx]].includes(goal)) {
            breakdown[weekdays[dayIdx]].push(goal);
          }
        }
      });

      wellnessGoals.forEach(goal => {
        if (goal.match(/sleep|hydrat|water/i)) {
          DAYS.forEach(day => {
            if (!breakdown[day].includes(goal)) breakdown[day].push(goal);
          });
        } else if (goal.match(/exercise|gym|workout/i)) {
          ["Monday", "Wednesday", "Friday", "Saturday"].forEach(day => {
            breakdown[day].push(goal);
          });
        } else if (goal.match(/walk/i)) {
          weekdays.forEach(day => { breakdown[day].push(goal); });
        } else {
          DAYS.forEach(day => { breakdown[day].push(goal); });
        }
      });

      if (breakdown["Saturday"].filter(g => !g.match(/exercise|walk|gym|workout|sleep|hydrat|water|mindful|meditat/i)).length === 0) {
        breakdown["Saturday"].unshift("Light review of the week's material 📖");
      }
      if (breakdown["Sunday"].filter(g => !g.match(/exercise|walk|gym|workout|sleep|hydrat|water|mindful|meditat/i)).length === 0) {
        breakdown["Sunday"].unshift("Rest & light prep for next week 🌿");
      }

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
    const validGoals = getSelectedGoalTexts();

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

  const focusTotal = Object.values(subjectFocus).reduce((s, v) => s + v, 0);

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
            <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>

            {step === "loading" && (
              <div className="flex flex-col items-center py-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                >
                  <Target className="h-10 w-10 text-primary" />
                </motion.div>
                <p className="mt-4 font-display text-base font-bold text-foreground">{getGreeting(displayName)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Preparing your personalized goals...</p>
              </div>
            )}

            {/* Subject Focus Step */}
            {step === "focus" && (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">{getGreeting(displayName)}</h2>
                    <p className="text-xs text-muted-foreground">How do you want to split your focus this week?</p>
                  </div>
                </div>

                <p className="mt-3 mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  📊 Drag sliders to set your subject priority
                </p>

                <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1">
                  {yearCourses.map((course, i) => {
                    const pct = subjectFocus[course.name] || 0;
                    return (
                      <motion.div
                        key={course.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-foreground truncate mr-2">{course.name}</span>
                          <span className={`text-sm font-bold tabular-nums ${pct >= 50 ? "text-primary" : pct > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                            {pct}%
                          </span>
                        </div>
                        <Slider
                          value={[pct]}
                          onValueChange={([v]) => handleFocusChange(course.name, v)}
                          min={0}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs font-medium ${focusTotal === 100 ? "text-primary" : "text-destructive"}`}>
                    Total: {focusTotal}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">Must equal 100%</span>
                </div>

                <Button
                  onClick={() => {
                    setStep("loading");
                    generateSuggestions();
                  }}
                  disabled={focusTotal !== 100}
                  className="mt-3 w-full rounded-xl bg-gradient-primary font-semibold"
                >
                  <span className="flex items-center gap-2">
                    Next: Set weekly goals <ChevronRight className="h-4 w-4" />
                  </span>
                </Button>
              </div>
            )}

            {step === "goals" && (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Weekly Goals</h2>
                    <p className="text-xs text-muted-foreground">{getMotivationalSubtext()}</p>
                  </div>
                </div>

                {/* Subject focus summary */}
                <div className="mt-2 mb-2 rounded-xl bg-muted/50 p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Your Focus Split</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(subjectFocus)
                      .filter(([, pct]) => pct > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, pct]) => (
                        <span key={name} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {name} · {pct}%
                        </span>
                      ))}
                  </div>
                </div>

                <p className="mt-2 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  ✨ Check the goals you want for this week
                </p>

                <div className="max-h-[35vh] space-y-1.5 overflow-y-auto pr-1">
                  {suggestedGoals.map((goal, i) => {
                    const checked = selectedGoals.has(i);
                    return (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => toggleGoal(i)}
                        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                          checked ? "bg-primary/10 ring-1 ring-primary/20" : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                          checked ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent"
                        }`}>
                          {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className={`text-sm ${checked ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                          {goal}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Input
                    value={customGoal}
                    onChange={e => setCustomGoal(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustomGoal()}
                    placeholder="Add your own goal..."
                    className="rounded-xl border-muted bg-muted/50 text-sm"
                  />
                  <Button onClick={addCustomGoal} disabled={!customGoal.trim()} size="sm" variant="outline" className="shrink-0 rounded-xl">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{selectedGoals.size} goals selected</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStep("focus")} className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
                      ← Edit focus
                    </button>
                    <button onClick={() => { setStep("loading"); generateSuggestions(); }} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
                      <RefreshCcw className="h-3 w-3" /> Regenerate
                    </button>
                  </div>
                </div>

                <Button
                  onClick={generateBreakdown}
                  disabled={loading || selectedGoals.size === 0}
                  className="mt-3 w-full rounded-xl bg-gradient-primary font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 animate-spin" /> Building your week...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Break down into daily plan <ChevronRight className="h-4 w-4" />
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
                <p className="mt-3 font-display text-sm font-bold text-foreground">Saving your plan...</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WeeklyGoalsPopup;
