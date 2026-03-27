import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Target, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isAfter, startOfWeek } from "date-fns";

interface WeeklyGoal {
  id: string;
  week_start: string;
  goals: string[];
  daily_breakdown: Record<string, string[]>;
  status: string;
  created_at: string;
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
        setGoals(data as WeeklyGoal[]);
      }
      setLoading(false);
    };
    fetchGoals();
  }, [user]);

  const toggleGoalStatus = async (goalId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "active" : "completed";
    await (supabase.from("weekly_goals" as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
      .eq("id", goalId) as any);
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: newStatus } : g));
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

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
              const statusIcon = goal.status === "completed"
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
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Week of {format(parseISO(goal.week_start), "MMM d, yyyy")}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">CURRENT</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => toggleGoalStatus(goal.id, goal.status)}>
                      {statusIcon}
                    </button>
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {(goal.goals as string[]).map((g, gi) => (
                      <li key={gi} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {gi + 1}
                        </span>
                        <span className={goal.status === "completed" ? "line-through text-muted-foreground" : ""}>
                          {g}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      goal.status === "completed"
                        ? "bg-green-500/10 text-green-600"
                        : isPast
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {goal.status === "completed" ? "✅ Achieved" : isPast ? "❌ Not completed" : "⏳ In progress"}
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
