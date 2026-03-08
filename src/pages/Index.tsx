import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { LogOut, Activity } from "lucide-react";
import ScoreCard from "@/components/ScoreCard";
import ScoreDetailModal from "@/components/ScoreDetailModal";
import StreakBadge from "@/components/StreakBadge";
import WeeklyChallenges from "@/components/WeeklyChallenges";
import { fetchHealthData, computeScores, requestHealthPermissions, isHealthAvailable, type HealthData } from "@/services/healthkit";

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
      label: "Cognitive Readiness",
      value: `${scores.cognitiveReadiness}/100`,
      numValue: scores.cognitiveReadiness,
      color: "bg-score-cognitive/15 text-score-cognitive",
      icon: "brain",
      reasoning: [
        `HRV recovery score: ${scores.factors.cognitive.hrvRecovery}%`,
        `Sleep quality contributed ${scores.factors.cognitive.sleepQuality}% to your score.`,
        `Deep sleep: ${scores.rawData.deepSleepHours}hrs (${scores.factors.cognitive.deepSleep}% of optimal).`,
      ],
      factors: [
        { label: "Sleep Quality", value: scores.factors.cognitive.sleepQuality },
        { label: "HRV Recovery", value: scores.factors.cognitive.hrvRecovery },
        { label: "Resting HR", value: scores.factors.cognitive.restingHR },
        { label: "Deep Sleep", value: scores.factors.cognitive.deepSleep },
      ],
    },
    {
      label: "Study Capacity",
      value: scores.studyCapacity,
      numValue: scores.factors.study.sleepFactor,
      color: "bg-score-study/15 text-score-study",
      icon: "clock",
      reasoning: [
        `Sleep factor: ${scores.factors.study.sleepFactor}% (${scores.rawData.sleepHours}hrs logged).`,
        `Recovery factor: ${scores.factors.study.recoveryFactor}% based on HRV of ${scores.rawData.hrv}ms.`,
        "Adjusted for your daily energy expenditure.",
      ],
      factors: [
        { label: "Sleep Factor", value: scores.factors.study.sleepFactor },
        { label: "Recovery Factor", value: scores.factors.study.recoveryFactor },
        { label: "Energy Reserves", value: Math.min(100, Math.round((scores.rawData.activeCalories / 400) * 100)) },
      ],
    },
    {
      label: "Burnout Risk",
      value: `${scores.burnoutRisk}/100`,
      numValue: scores.burnoutRisk,
      color: "bg-score-burnout/15 text-score-burnout",
      icon: "alert",
      reasoning: [
        scores.burnoutRisk < 30 ? "Low risk — your recovery metrics look healthy." : "Elevated risk — consider taking breaks.",
        `Sleep debt contribution: ${scores.factors.burnout.sleepDebt}%.`,
        `Stress markers from resting HR: ${scores.factors.burnout.stressMarkers}%.`,
      ],
      factors: [
        { label: "Sleep Debt", value: scores.factors.burnout.sleepDebt },
        { label: "Stress Markers", value: scores.factors.burnout.stressMarkers },
        { label: "HRV Stress", value: scores.factors.burnout.hrvStress },
      ],
    },
    {
      label: "Retention Outlook",
      value: `${scores.retentionOutlook}%`,
      numValue: scores.retentionOutlook,
      color: "bg-score-retention/15 text-score-retention",
      icon: "book",
      reasoning: [
        `Deep sleep consolidation: ${scores.factors.retention.deepSleep}%.`,
        `Overall rest quality: ${scores.factors.retention.restQuality}%.`,
        `HRV-based consolidation capacity: ${scores.factors.retention.hrvConsolidation}%.`,
      ],
      factors: [
        { label: "Deep Sleep Consolidation", value: scores.factors.retention.deepSleep },
        { label: "Rest Quality", value: scores.factors.retention.restQuality },
        { label: "HRV Consolidation", value: scores.factors.retention.hrvConsolidation },
      ],
    },
    {
      label: "Peak Study Window",
      value: scores.peakWindow,
      numValue: 90,
      color: "bg-score-peak/15 text-score-peak",
      icon: "sun",
      reasoning: [
        "Estimated from your wake time and cortisol curve.",
        "Body temperature rhythm aligns with this alertness window.",
        `Based on ${scores.rawData.sleepHours}hrs of sleep ending around ${scores.rawData.sleepHours >= 7 ? "7am" : "8am"}.`,
      ],
      factors: [
        { label: "Cortisol Timing", value: 90 },
        { label: "Temperature Rhythm", value: 85 },
        { label: "Sleep Schedule", value: Math.min(100, Math.round((scores.rawData.sleepHours / 8) * 100)) },
      ],
    },
  ];
}

const Index = () => {
  const { user, logout } = useAuth();
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

  const scores = useMemo(() => {
    if (!healthData) return null;
    return computeScores(healthData);
  }, [healthData]);

  const scoresData = useMemo(() => {
    if (!scores) return [];
    return buildScoresData(scores);
  }, [scores]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 pb-10 pt-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <StreakBadge streak={user.streak} studySessions={user.studySessions} />
          <button onClick={logout} className="rounded-xl p-2 text-muted-foreground hover:bg-muted">
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-foreground">
            {greeting}, {user.name} 👋
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">{motivation}</p>
        </motion.div>

        {/* Health data source indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-3 flex items-center justify-between"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Today's Insights
          </h2>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
            <Activity className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              {healthConnected ? "Apple Health" : "Preview Data"}
            </span>
          </div>
        </motion.div>

        {/* Scores */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-3">
            {scoresData.map((score, i) => (
              <ScoreCard
                key={score.label}
                label={score.label}
                value={score.value}
                icon={score.icon}
                colorClass={score.color}
                index={i}
                onClick={() => setSelectedScore(score)}
              />
            ))}
          </div>
        )}

        {/* Weekly Challenges */}
        <WeeklyChallenges />
      </div>

      {/* Score Detail Modal */}
      {selectedScore && (
        <ScoreDetailModal score={selectedScore} onClose={() => setSelectedScore(null)} />
      )}
    </div>
  );
};

export default Index;
