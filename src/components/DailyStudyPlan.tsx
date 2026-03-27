import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, Sparkles, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DisagreeButton from "@/components/DisagreeButton";
import { getCoursesForYear, curriculum } from "@/data/curriculum";

interface PlanItem {
  time: string;
  task: string;
  reason: string;
  done: boolean;
}

interface DailyStudyPlanProps {
  scores: {
    cognitiveReadiness: number;
    burnoutRisk: number;
    peakWindow: string;
    studyCapacity: string;
    studyBlockRecommendation: { blockMinutes: number; breakMinutes: number; label: string; tier: string };
  } | null;
  weeklyGoalsTasks?: Record<string, string[]> | null;
}

const DailyStudyPlan = ({ scores, weeklyGoalsTasks }: DailyStudyPlanProps) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [generated, setGenerated] = useState(false);
  const getTodayGoalTasks = (): string[] => {
    if (!weeklyGoalsTasks) return [];
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return weeklyGoalsTasks[today] || [];
  };

  const generatePlan = async () => {
    if (!user || !scores) return;
    setLoading(true);
    try {
      // Fetch persona, feedback, and recent study logs in parallel
      const [feedbackRes, personaRes, logsRes, masteryRes] = await Promise.all([
        supabase
          .from("user_feedback")
          .select("feedback_type, reason, context")
          .order("created_at", { ascending: false })
          .limit(10) as any,
        supabase
          .from("student_personas")
          .select("study_style, goals, biggest_challenge, motivation_type, preferred_session_length, learning_method, weekly_study_hours, stress_management")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("study_logs")
          .select("subject, topic, duration_minutes, difficulty")
          .eq("user_id", user.id)
          .order("studied_at", { ascending: false })
          .limit(20),
        supabase
          .from("topic_mastery")
          .select("course_name, topic_name, status")
          .eq("user_id", user.id) as any,
      ]);

      // Build topic mastery summary for AI
      const masteryData = (masteryRes.data || []) as Array<{ course_name: string; topic_name: string; status: string }>;
      const topicMastery = masteryData.reduce((acc: Record<string, Array<{ topic: string; status: string }>>, m) => {
        if (!acc[m.course_name]) acc[m.course_name] = [];
        acc[m.course_name].push({ topic: m.topic_name, status: m.status });
        return acc;
      }, {});

      // Get student year from metadata
      const year = user.user_metadata?.year || 1;

      // All courses for the student's year
      const currentCourses = getCoursesForYear(year);
      const recentSubjects = [...new Set((logsRes.data || []).map((l: any) => l.subject))];
      const crossSemesterSubjects = recentSubjects.filter(
        (s: string) => !currentCourses.some(c => c.name === s)
      );
      // Find credits for cross-semester subjects
      const allCourses = curriculum.flatMap(s => s.courses);
      const crossSemesterCourses = crossSemesterSubjects.map((name: string) => {
        const found = allCourses.find(c => c.name === name);
        return { name, credits: found?.credits || 0 };
      });

      const { data, error } = await supabase.functions.invoke("daily-plan", {
        body: {
          cognitiveReadiness: scores.cognitiveReadiness,
          burnoutRisk: scores.burnoutRisk,
          peakWindow: scores.peakWindow,
          studyCapacity: scores.studyCapacity,
          studyBlock: scores.studyBlockRecommendation,
          pastFeedback: feedbackRes.data || [],
          persona: personaRes.data || null,
          currentCourses: currentCourses.map(c => ({ name: c.name, credits: c.credits })),
          crossSemesterCourses,
          recentStudyLogs: (logsRes.data || []).slice(0, 10),
          topicMastery,
          year,
        },
      });
      if (error) throw error;
      if (data?.plan) {
        let items: PlanItem[] = data.plan.map((p: any) => ({ ...p, done: false }));
        // Inject weekly goal tasks for today
        const todayGoalTasks = getTodayGoalTasks();
        if (todayGoalTasks.length > 0) {
          const goalItems: PlanItem[] = todayGoalTasks.map(task => ({
            time: "Weekly Goal",
            task,
            reason: "From your weekly goals",
            done: false,
          }));
          items = [...goalItems, ...items];
        }
        setPlan(items);
        setGenerated(true);
      }
    } catch (e) {
      console.error("Plan generation failed:", e);
      // Fallback plan
      setPlan(getFallbackPlan(scores));
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const getFallbackPlan = (s: DailyStudyPlanProps["scores"]): PlanItem[] => {
    if (!s) return [];
    const peak = s.peakWindow;
    const block = s.studyBlockRecommendation;
    const b = `${block.blockMinutes} min`;
    const brk = block.breakMinutes > 0 ? ` + ${block.breakMinutes} min break` : "";
    
    if (s.burnoutRisk > 50) {
      return [
        { time: "Morning", task: `Light flashcard review (${b})`, reason: `Short block to ease in${brk}`, done: false },
        { time: "Midday", task: "Walk or rest (15 min)", reason: "Recovery reduces burnout risk", done: false },
        { time: "Afternoon", task: `One focused session (${b})`, reason: `Keep to single block${brk}`, done: false },
      ];
    }
    
    return [
      { time: "Pre-peak", task: `Warm up with flashcards (${b})`, reason: `Prime your brain${brk}`, done: false },
      { time: peak, task: `Deep study — hardest topic (${b})`, reason: "Peak cognitive window", done: false },
      { time: "Post-peak", task: `Active recall practice (${b})`, reason: `Cement what you learned${brk}`, done: false },
      { time: "Evening", task: "Light review + log session", reason: "Consolidate and track progress", done: false },
    ];
  };

  const toggleDone = (idx: number) => {
    setPlan(prev => prev.map((p, i) => i === idx ? { ...p, done: !p.done } : p));
  };

  const doneCount = plan.filter(p => p.done).length;

  useEffect(() => {
    if (scores && !generated) {
      generatePlan();
    }
  }, [scores]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="rounded-3xl bg-card p-5 shadow-card"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <CalendarClock className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-display text-base font-bold text-foreground">Today's Plan</h3>
            {generated && (
              <p className="text-xs text-muted-foreground">
                {doneCount}/{plan.length} completed
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {generated && (
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary">AI</span>
            </div>
          )}
          <DisagreeButton
            feedbackType="daily_plan"
            context={{ plan: plan.map(p => p.task) }}
          />
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div className="mt-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {plan.map((item, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => toggleDone(i)}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all ${
                      item.done ? "bg-primary/5 opacity-60" : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <motion.div
                      animate={item.done ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-5 w-5 shrink-0 transition-colors ${
                          item.done ? "text-primary" : "text-muted-foreground/30"
                        }`}
                      />
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.time}</span>
                      </div>
                      <p className={`text-sm font-medium ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.task}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">{item.reason}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {doneCount === plan.length && plan.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 rounded-xl bg-primary/10 p-3 text-center"
              >
                <p className="text-sm font-bold text-primary">🎉 All tasks done! Great work today.</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DailyStudyPlan;
