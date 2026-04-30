import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Brain, Clock, Sparkles, Loader2, Timer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface StudyLog {
  id: string;
  subject: string;
  topic: string;
  duration_minutes: number;
  difficulty: number;
  stress_level: number;
  distraction_level: number;
  energy_level: number;
  notes: string | null;
  studied_at: string;
}

const levelColors: Record<number, string> = {
  1: "bg-score-cognitive/15 text-score-cognitive",
  2: "bg-score-study/15 text-score-study",
  3: "bg-score-peak/15 text-score-peak",
  4: "bg-score-burnout/15 text-score-burnout",
  5: "bg-destructive/15 text-destructive",
};

const StudyLogs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("study_logs")
      .select("*")
      .order("studied_at", { ascending: false });

    if (error) { toast.error("Failed to load logs"); return; }
    setLogs(data || []);
    setLoading(false);
  };

  const getInsights = async () => {
    if (logs.length < 3) { toast.error("Log at least 3 sessions for AI insights"); return; }
    setLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-habits", {
        body: { logs: logs.slice(0, 30) },
      });
      if (error) throw error;
      setInsights(data.analysis);
    } catch (err: any) {
      toast.error(err.message || "Failed to get insights");
    } finally {
      setLoadingInsights(false);
    }
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 pb-10 pt-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => navigate("/")} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </button>

          <div className="mb-4 flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold text-foreground">Study Logs</h1>
            <Button onClick={() => navigate("/study-logs/new")} variant="outline" size="sm" className="rounded-xl gap-1.5">
              <Plus className="h-4 w-4" /> Manual log
            </Button>
          </div>

          <Button
            onClick={() => navigate("/study-timer")}
            className="mb-6 h-14 w-full rounded-2xl bg-gradient-primary text-base font-semibold text-primary-foreground gap-2"
          >
            <Timer className="h-5 w-5" /> Start a live study session
          </Button>

          {/* AI Insights */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-6">
            <Button
              variant="outline"
              onClick={getInsights}
              disabled={loadingInsights || logs.length < 3}
              className="w-full rounded-xl h-11 gap-2 border-primary/20 text-primary hover:bg-primary/5"
            >
              {loadingInsights ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loadingInsights ? "Analyzing your habits..." : "Get AI Study Insights"}
            </Button>

            {insights && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-2xl bg-primary/5 border border-primary/10 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{insights}</p>
              </motion.div>
            )}
          </motion.div>

          {/* Logs list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center shadow-card">
              <Brain className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No study sessions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Log your first session to start tracking!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl bg-card p-4 shadow-card"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-display font-bold text-foreground">{log.subject}</h3>
                      <p className="text-sm text-muted-foreground">{log.topic}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-sm font-medium">{formatDuration(log.duration_minutes)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColors[log.difficulty]}`}>
                      Difficulty: {log.difficulty}/5
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColors[log.stress_level]}`}>
                      Stress: {log.stress_level}/5
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColors[log.energy_level]}`}>
                      Energy: {log.energy_level}/5
                    </span>
                  </div>

                  {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                  <p className="text-xs text-muted-foreground/60 mt-2">{format(new Date(log.studied_at), "MMM d, yyyy · h:mm a")}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default StudyLogs;
