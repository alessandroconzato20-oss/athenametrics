import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { LogOut, Activity, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ScoreCard from "@/components/ScoreCard";
import ScoreDetailModal from "@/components/ScoreDetailModal";
import StreakBadge from "@/components/StreakBadge";
import WeeklyChallenges from "@/components/WeeklyChallenges";
import BurnoutTrendChart from "@/components/BurnoutTrendChart";
import { fetchHealthData, computeScores, requestHealthPermissions, isHealthAvailable, type HealthData } from "@/services/healthkit";
import { format } from "date-fns";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const getMotivation = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "let's get after it 💪";
  if (hour < 17) return "keep the momentum going 🔥";
  return "time to wind down smart 🌙";
};

function buildScoresData(scores: ReturnType<typeof computeScores>) {
  return [
    {
      label: "Cognitive Readiness", value: `${scores.cognitiveReadiness}/100`, numValue: scores.cognitiveReadiness,
      color: "bg-score-cognitive/15 text-score-cognitive", icon: "brain",
      reasoning: [`HRV recovery score: ${scores.factors.cognitive.hrvRecovery}%`, `Sleep quality contributed ${scores.factors.cognitive.sleepQuality}% to your score.`, `Deep sleep: ${scores.rawData.deepSleepHours}hrs.`],
      factors: [{ label: "Sleep Quality", value: scores.factors.cognitive.sleepQuality }, { label: "HRV Recovery", value: scores.factors.cognitive.hrvRecovery }, { label: "Resting HR", value: scores.factors.cognitive.restingHR }, { label: "Deep Sleep", value: scores.factors.cognitive.deepSleep }],
    },
    {
      label: "Study Capacity", value: scores.studyCapacity, numValue: scores.factors.study.sleepFactor,
      color: "bg-score-study/15 text-score-study", icon: "clock",
      reasoning: [`Sleep factor: ${scores.factors.study.sleepFactor}%`, `Recovery factor: ${scores.factors.study.recoveryFactor}%`],
      factors: [{ label: "Sleep Factor", value: scores.factors.study.sleepFactor }, { label: "Recovery Factor", value: scores.factors.study.recoveryFactor }],
    },
    {
      label: "Burnout Risk", value: `${scores.burnoutRisk}/100`, numValue: scores.burnoutRisk,
      color: "bg-score-burnout/15 text-score-burnout", icon: "alert",
      reasoning: [scores.burnoutRisk < 30 ? "Low risk — recovery metrics look healthy." : "Elevated risk — consider resting.", `Sleep debt: ${scores.factors.burnout.sleepDebt}%`],
      factors: [{ label: "Sleep Debt", value: scores.factors.burnout.sleepDebt }, { label: "Stress Markers", value: scores.factors.burnout.stressMarkers }, { label: "HRV Stress", value: scores.factors.burnout.hrvStress }],
    },
    {
      label: "Retention Outlook", value: `${scores.retentionOutlook}%`, numValue: scores.retentionOutlook,
      color: "bg-score-retention/15 text-score-retention", icon: "book",
      reasoning: [`Deep sleep consolidation: ${scores.factors.retention.deepSleep}%`, `Rest quality: ${scores.factors.retention.restQuality}%`],
      factors: [{ label: "Deep Sleep", value: scores.factors.retention.deepSleep }, { label: "Rest Quality", value: scores.factors.retention.restQuality }, { label: "HRV Consolidation", value: scores.factors.retention.hrvConsolidation }],
    },
    {
      label: "Peak Study Window", value: scores.peakWindow, numValue: 90,
      color: "bg-score-peak/15 text-score-peak", icon: "sun",
      reasoning: ["Based on your wake time and cortisol curve.", `Sleep: ${scores.rawData.sleepHours}hrs.`],
      factors: [{ label: "Cortisol Timing", value: 90 }, { label: "Temperature Rhythm", value: 85 }],
    },
  ];
}

const Index = () => {
  const { user, signOut, displayName, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedScore, setSelectedScore] = useState<any>(null);
  const [healthConnected, setHealthConnected] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => getGreeting(), []);
  const motivation = useMemo(() => getMotivation(), []);

  useEffect(() => {
    async function init() {
      const available = await isHealthAvailable();
      if (available) {
        const granted = await requestHealthPermissions();
        setHealthConnected(granted);
      }
      const data = await fetchHealthData();
      setHealthData(data);
      setLoading(false);
    }
    init();
  }, []);

  const scores = useMemo(() => healthData ? computeScores(healthData) : null, [healthData]);
  const scoresData = useMemo(() => scores ? buildScoresData(scores) : [], [scores]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 pb-10 pt-8">
        <div className="mb-6 flex items-start justify-between">
          <StreakBadge streak={7} studySessions={23} />
          <button onClick={signOut} className="rounded-xl p-2 text-muted-foreground hover:bg-muted">
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">{greeting}, {displayName} 👋</h1>
          <p className="mt-1 text-lg text-muted-foreground">{motivation}</p>
        </motion.div>

        {/* Study Logs shortcut */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-6">
          <Button onClick={() => navigate("/study-logs")} variant="outline" className="w-full rounded-xl h-12 gap-2 border-primary/20 text-primary hover:bg-primary/5">
            <BookOpen className="h-4 w-4" /> Study Logs & AI Insights
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today's Insights</h2>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
            <Activity className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">{healthConnected ? "Apple Health" : "Preview Data"}</span>
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-3">
            {scoresData.map((score, i) => (
              <ScoreCard key={score.label} label={score.label} value={score.value} icon={score.icon} colorClass={score.color} index={i} onClick={() => setSelectedScore(score)} />
            ))}
          </div>
        )}

        <WeeklyChallenges />
      </div>

      {selectedScore && <ScoreDetailModal score={selectedScore} onClose={() => setSelectedScore(null)} />}
    </div>
  );
};

export default Index;
