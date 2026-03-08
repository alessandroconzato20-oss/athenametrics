import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import ScoreCard from "@/components/ScoreCard";
import ScoreDetailModal from "@/components/ScoreDetailModal";
import StreakBadge from "@/components/StreakBadge";
import WeeklyChallenges from "@/components/WeeklyChallenges";

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

const scoresData = [
  {
    label: "Cognitive Readiness",
    value: "82/100",
    numValue: 82,
    color: "bg-score-cognitive/15 text-score-cognitive",
    icon: "brain",
    reasoning: [
      "HRV indicates strong parasympathetic recovery overnight.",
      "Sleep quality was above average with 2.1 hrs of deep sleep.",
      "Resting heart rate is 6 bpm below your baseline.",
    ],
    factors: [
      { label: "Sleep Quality", value: 88 },
      { label: "HRV Recovery", value: 79 },
      { label: "Resting HR", value: 85 },
      { label: "Movement Score", value: 72 },
    ],
  },
  {
    label: "Study Capacity",
    value: "4h 30m",
    numValue: 75,
    color: "bg-score-study/15 text-score-study",
    icon: "clock",
    reasoning: [
      "Based on current cognitive load and energy reserves.",
      "Adjusted for your semester workload pattern.",
      "Accounts for 2 lectures already attended today.",
    ],
    factors: [
      { label: "Energy Reserves", value: 70 },
      { label: "Cognitive Load", value: 65 },
      { label: "Schedule Density", value: 80 },
      { label: "Recovery Status", value: 85 },
    ],
  },
  {
    label: "Burnout Risk",
    value: "28/100",
    numValue: 28,
    color: "bg-score-burnout/15 text-score-burnout",
    icon: "alert",
    reasoning: [
      "Low risk — you've maintained good rest-to-work ratios.",
      "Stress markers from wearable are within healthy range.",
      "You took breaks between study blocks yesterday.",
    ],
    factors: [
      { label: "Work-Rest Ratio", value: 25 },
      { label: "Stress Markers", value: 30 },
      { label: "Sleep Debt", value: 18 },
      { label: "Emotional Load", value: 35 },
    ],
  },
  {
    label: "Retention Outlook",
    value: "74%",
    numValue: 74,
    color: "bg-score-retention/15 text-score-retention",
    icon: "book",
    reasoning: [
      "Your spaced repetition timing is well-aligned.",
      "Deep sleep duration supports memory consolidation.",
      "Recommend reviewing biochemistry notes before 3pm.",
    ],
    factors: [
      { label: "Spaced Repetition", value: 80 },
      { label: "Sleep Consolidation", value: 78 },
      { label: "Active Recall Rate", value: 65 },
      { label: "Review Frequency", value: 70 },
    ],
  },
  {
    label: "Peak Study Window",
    value: "10:00 – 12:30",
    numValue: 90,
    color: "bg-score-peak/15 text-score-peak",
    icon: "sun",
    reasoning: [
      "Cortisol curve peaks around 10am based on your wake time.",
      "Body temperature rhythm suggests highest alertness mid-morning.",
      "Historical performance data confirms this window.",
    ],
    factors: [
      { label: "Cortisol Timing", value: 92 },
      { label: "Temperature Rhythm", value: 88 },
      { label: "Historical Data", value: 85 },
      { label: "Alertness Trend", value: 90 },
    ],
  },
];

const Index = () => {
  const { user, logout } = useAuth();
  const [selectedScore, setSelectedScore] = useState<typeof scoresData[0] | null>(null);

  const greeting = useMemo(() => getGreeting(), []);
  const motivation = useMemo(() => getMotivation(), []);

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

        {/* Scores */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-3"
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Today's Insights
          </h2>
        </motion.div>

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
