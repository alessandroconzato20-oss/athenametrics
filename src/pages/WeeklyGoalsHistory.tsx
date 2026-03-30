import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Target, CheckCircle2, XCircle, Clock, Check } from "lucide-react";
import StudyCalendar from "@/components/StudyCalendar";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isAfter, startOfWeek } from "date-fns";

interface WeeklyGoal {
  id: string;
  week_start: string;
  goals: string[];
  daily_breakdown: Record<string, string[]>;
  status: string;
  created_at: string;
  completed_goals?: number[]; // indices of individually completed goals
}

const WeeklyGoalsHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchGoals = async () => {
      const { data, error } = await (supabase.from("weekly_goals" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .limit(20) as any);

      if (!error && data) {
        // Parse completed_goals from the goals JSON if stored, or default
        const parsed = (data as any[]).map(g => ({
          ...g,
          completed_goals: Array.isArray((g as any).completed_goals) ? (g as any).completed_goals : [],
        }));
        setGoals(parsed as WeeklyGoal[]);
      }
      setLoading(false);
    };
    fetchGoals();
  }, [user]);

  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const toggleIndividualGoal = async (goalId: string, goalIndex: number, weekStart: string) => {
    // Only allow for current week
    if (weekStart !== currentWeekStart) return;

    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const completed = new Set(goal.completed_goals || []);
    if (completed.has(goalIndex)) {
      completed.delete(goalIndex);
    } else {
      completed.add(goalIndex);
    }

    const completedArr = Array.from(completed);
    const allDone = completedArr.length === (goal.goals as string[]).length;
    const newStatus = allDone ? "completed" : "active";

    await (supabase.from("weekly_goals" as any)
      .update({
        completed_goals: completedArr,
        status: newStatus,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", goalId) as any);

    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, completed_goals: completedArr, status: newStatus } : g
    ));
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 pb-10 pt-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="rounded-xl p-2 text-muted-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Weekly Goals</h1>
            <p className="text-xs text-muted-foreground">Your goal history & achievements</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center rounded-3xl bg-card p-8 text-center shadow-card"
          >
            <Target className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No weekly goals set yet</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Goals will appear here after you set them on Monday</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal, idx) => {
              const isCurrent = goal.week_start === currentWeekStart;
              const isPast = !isCurrent && !isAfter(parseISO(goal.week_start), new Date());
              const completedSet = new Set(goal.completed_goals || []);
              const completedCount = completedSet.size;
              const totalGoals = (goal.goals as string[]).length;
              const allDone = completedCount === totalGoals && totalGoals > 0;

              const statusIcon = allDone || goal.status === "completed"
                ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                : isPast
                ? <XCircle className="h-5 w-5 text-destructive/60" />
                : <Clock className="h-5 w-5 text-primary" />;

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-2xl bg-card p-4 shadow-card ${isCurrent ? "ring-2 ring-primary/20" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Week of {format(parseISO(goal.week_start), "MMM d, yyyy")}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">CURRENT</span>
                      )}
                    </div>
                    {statusIcon}
                  </div>

                  {/* Progress bar for current week */}
                  {isCurrent && totalGoals > 0 && (
                    <div className="mt-2 mb-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">{completedCount}/{totalGoals} completed</span>
                        <span className="text-[10px] font-medium text-primary">{Math.round((completedCount / totalGoals) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${(completedCount / totalGoals) * 100}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </div>
                  )}

                  <ul className="mt-3 space-y-1.5">
                    {(goal.goals as string[]).map((g, gi) => {
                      const isDone = completedSet.has(gi);
                      const canToggle = isCurrent;

                      return (
                        <li key={gi} className="flex items-start gap-2 text-sm text-foreground">
                          <button
                            onClick={() => canToggle && toggleIndividualGoal(goal.id, gi, goal.week_start)}
                            disabled={!canToggle}
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                              isDone
                                ? "border-green-500 bg-green-500"
                                : canToggle
                                ? "border-muted-foreground/30 bg-transparent hover:border-primary/50"
                                : "border-muted-foreground/20 bg-transparent cursor-default"
                            }`}
                          >
                            {isDone && <Check className="h-3 w-3 text-white" />}
                          </button>
                          <span className={isDone ? "line-through text-muted-foreground" : isPast ? "text-muted-foreground" : ""}>
                            {g}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 flex items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      allDone || goal.status === "completed"
                        ? "bg-green-500/10 text-green-600"
                        : isPast
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {allDone || goal.status === "completed"
                        ? "✅ Achieved"
                        : isPast
                        ? `❌ ${completedCount}/${totalGoals} completed`
                        : "⏳ In progress"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyGoalsHistory;
