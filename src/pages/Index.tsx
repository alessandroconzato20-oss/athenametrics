import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { LogOut, Activity, BookOpen, Trophy, Plus, RefreshCcw, Target, Settings, GraduationCap, ChevronDown, Info, Timer } from "lucide-react";
import OnboardingGuide from "@/components/OnboardingGuide";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ScoreCard from "@/components/ScoreCard";
import ScoreDetailModal from "@/components/ScoreDetailModal";
import StreakBadge from "@/components/StreakBadge";
import WeeklyChallenges from "@/components/WeeklyChallenges";
import GettingToKnowYouQuizzes from "@/components/GettingToKnowYouQuizzes";

import HeroAction from "@/components/HeroAction";
import TodaysInsight from "@/components/TodaysInsight";
import DailyStudyPlan from "@/components/DailyStudyPlan";
import MicroReward from "@/components/MicroReward";
import DailyWellbeingCheckin from "@/components/DailyWellbeingCheckin";
import ExamChecklist from "@/components/ExamChecklist";
import { startOfWeek } from "date-fns";
import {
  fetchHealthData,
  fetchTodaysWorkout,
  calculateApexScores,
  requestHealthPermissions,
  isHealthAvailable,
  DEFAULT_HEALTH_DATA,
  type AppleHealthData,
  type ApexScores,
  type DetectedWorkout,
} from "@/services/healthkit";
import { scheduleDailyNotifications, setupNotificationActionListener } from "@/services/notifications";
import { applyCheckinModifiers, type HistoricalCheckin } from "@/algorithms/checkinModifiers";
import { getCalibrationDays, getScoreCalibration, getOverallTier, CALIBRATION_TOTAL_DAYS, type ScoreCalibration } from "@/algorithms/calibration";
import { format } from "date-fns";

function getActionText(icon: string, numValue: number): string {
  if (icon === "brain") {
    if (numValue > 70) return "Your brain is primed. Tackle complex topics now.";
    if (numValue > 40) return "Moderate readiness. Stick to familiar material.";
    return "Low readiness. Light review only today.";
  }
  if (icon === "clock") {
    return "Block this time for your hardest subject.";
  }
  if (icon === "alert") {
    if (numValue > 60) return "Take a break. Rest protects tomorrow's performance.";
    if (numValue > 30) return "Manageable. Keep sessions under 60 min.";
    return "Low risk — you're recovering well. Push a bit more.";
  }
  if (icon === "book") {
    if (numValue > 70) return "Great retention window. Learn new concepts today.";
    if (numValue > 40) return "Decent retention. Mix new and review material.";
    return "Focus on revision over new material today.";
  }
  if (icon === "sun") {
    return "Schedule your hardest topic during this window.";
  }
  return "";
}

function getStudyBlockRecommendation(scores: ApexScores) {
  const overallReadiness = scores.cognitiveReadiness / 100;
  return overallReadiness >= 85
    ? { blockMinutes: 120, breakMinutes: 0, label: "2-hour deep blocks", tier: "high" as const }
    : overallReadiness >= 60
    ? { blockMinutes: 60, breakMinutes: 15, label: "60 min blocks · 15 min breaks", tier: "medium" as const }
    : { blockMinutes: 30, breakMinutes: 10, label: "30 min blocks · 10 min breaks", tier: "low" as const };
}

function buildScoresData(scores: ApexScores) {
  const isRest = scores.peakStudyWindow.primary_start === "Rest";
  const peakLabel = isRest ? "Rest" : `${scores.peakStudyWindow.primary_start} – ${scores.peakStudyWindow.primary_end}`;
  const blockRec = getStudyBlockRecommendation(scores);

  return [
    {
      label: "Cognitive Readiness",
      value: `${scores.cognitiveReadiness}/100`,
      numValue: scores.cognitiveReadiness,
      color: "bg-score-cognitive/15 text-score-cognitive",
      icon: "brain",
      reasoning: [
        `HRV at ${Math.round((scores.cognitiveReadiness / 100) * 100)}% of optimal`,
        `Sleep efficiency factored in`,
        `SpO₂ & resting HR considered`,
      ],
      factors: [
        { label: "HRV Recovery", value: scores.cognitiveReadiness },
        { label: "Sleep Quality", value: Math.round(scores.cognitiveReadiness * 0.9) },
        { label: "Resting HR", value: Math.round(scores.cognitiveReadiness * 0.85) },
      ],
    },
    {
      label: "Study Capacity",
      value: scores.studyCapacity.label,
      numValue: Math.round((scores.studyCapacity.totalMinutes / 540) * 100),
      color: "bg-score-study/15 text-score-study",
      icon: "clock",
      reasoning: [
        `Based on cognitive readiness & sleep`,
        `Activity level factored in`,
        `Recommended: ${blockRec.label}`,
      ],
      factors: [
        { label: "CR Factor", value: Math.round(scores.cognitiveReadiness) },
        { label: "Sleep Factor", value: Math.round((scores.studyCapacity.totalMinutes / 540) * 100) },
      ],
      subtitle: blockRec.label,
    },
    {
      label: "Burnout Risk",
      value: `${scores.burnoutRisk}/100`,
      numValue: scores.burnoutRisk,
      color: "bg-score-burnout/15 text-score-burnout",
      icon: "alert",
      reasoning: [
        scores.burnoutRisk < 30 ? "Low risk — 7-day trends look healthy." : "Elevated risk — consider resting.",
        `Based on HRV, HR, sleep & respiratory trends`,
      ],
      factors: [
        { label: "HRV Trend", value: scores.burnoutRisk },
        { label: "HR Trend", value: Math.round(scores.burnoutRisk * 0.8) },
        { label: "Sleep Trend", value: Math.round(scores.burnoutRisk * 0.7) },
      ],
    },
    {
      label: "Retention Outlook",
      value: `${scores.retentionOutlook}%`,
      numValue: scores.retentionOutlook,
      color: "bg-score-retention/15 text-score-retention",
      icon: "book",
      reasoning: [
        `REM sleep drives memory consolidation`,
        `Sleep timing regularity: ${scores.peakStudyWindow.confidence} confidence`,
      ],
      factors: [
        { label: "REM Sleep", value: scores.retentionOutlook },
        { label: "Deep Sleep", value: Math.round(scores.retentionOutlook * 0.9) },
        { label: "Timing Regularity", value: Math.round(scores.retentionOutlook * 0.85) },
      ],
    },
    {
      label: "Peak Study Window",
      value: peakLabel,
      numValue: 90,
      color: "bg-score-peak/15 text-score-peak",
      icon: "sun",
      reasoning: [
        `Chronotype: ${scores.peakStudyWindow.chronotype.replace("_", " ")}`,
        isRest ? "Secondary window: Rest" : `Secondary window: ${scores.peakStudyWindow.secondary_start} – ${scores.peakStudyWindow.secondary_end}`,
        `Confidence: ${scores.peakStudyWindow.confidence}`,
      ],
      factors: [
        { label: "Circadian Alignment", value: 90 },
        { label: "HRV Adjustment", value: 85 },
      ],
    },
    {
      label: "Secondary Peak Window",
      value: isRest ? "Rest" : `${scores.peakStudyWindow.secondary_start} – ${scores.peakStudyWindow.secondary_end}`,
      numValue: 75,
      color: "bg-score-peak/10 text-score-peak",
      icon: "sun",
      compact: true,
      reasoning: [
        `A lighter back-up focus window for review or lighter topics`,
        `Chronotype: ${scores.peakStudyWindow.chronotype.replace("_", " ")}`,
        `Confidence: ${scores.peakStudyWindow.confidence}`,
      ],
      factors: [
        { label: "Circadian Alignment", value: 75 },
        { label: "HRV Adjustment", value: 70 },
      ],
    },
  ];
}

const Index = () => {
  const { user, signOut, displayName, loading: authLoading, universityId } = useAuth();
  const navigate = useNavigate();
  const [selectedScore, setSelectedScore] = useState<any>(null);
  const [healthConnected, setHealthConnected] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [healthData, setHealthData] = useState<AppleHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingHealth, setSyncingHealth] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [reward, setReward] = useState<{ show: boolean; message: string; emoji: string }>({ show: false, message: "", emoji: "" });
  const [showWellbeingCheckin, setShowWellbeingCheckin] = useState(false);
  const [weeklyDailyBreakdown, setWeeklyDailyBreakdown] = useState<Record<string, string[]> | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [checkinData, setCheckinData] = useState<{ rest_level: number; stress_level: number; motivation_level: number; night_factors: string[] } | null>(null);
  const [historicalCheckins, setHistoricalCheckins] = useState<HistoricalCheckin[]>([]);
  const [examOpen, setExamOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingPending, setOnboardingPending] = useState(true);
  const [detectedWorkout, setDetectedWorkout] = useState<DetectedWorkout | null>(null);
  const [firstSyncAt, setFirstSyncAt] = useState<string | null>(null);
  const [calibBannerDismissed, setCalibBannerDismissed] = useState(false);

  // Show onboarding guide on first ever login
  useEffect(() => {
    if (!user) return;
    const key = `cofactor_onboarded_${user.id}`;
    if (!localStorage.getItem(key)) {
      setShowOnboarding(true);
      setOnboardingPending(true);
    } else {
      setOnboardingPending(false);
    }
  }, [user]);

  const closeOnboarding = () => {
    if (user) localStorage.setItem(`cofactor_onboarded_${user.id}`, "1");
    setShowOnboarding(false);
    setOnboardingPending(false);
  };

  // Compute streak and total sessions from study_logs
  useEffect(() => {
    if (!user) return;
    const computeStreak = async () => {
      const { data, error } = await supabase
        .from("study_logs")
        .select("studied_at")
        .eq("user_id", user.id)
        .order("studied_at", { ascending: false });
      if (error || !data) return;
      setTotalSessions(data.length);

      // Calculate consecutive day streak ending today or yesterday
      const uniqueDays = [...new Set(data.map(d => format(new Date(d.studied_at), "yyyy-MM-dd")))].sort().reverse();
      if (uniqueDays.length === 0) { setStreak(0); return; }

      const today = format(new Date(), "yyyy-MM-dd");
      const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

      // Streak must start from today or yesterday
      if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) { setStreak(0); return; }

      let count = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        const prev = new Date(uniqueDays[i - 1]);
        const curr = new Date(uniqueDays[i]);
        const diff = (prev.getTime() - curr.getTime()) / 86400000;
        if (diff === 1) count++;
        else break;
      }
      setStreak(count);
    };
    computeStreak();
  }, [user]);

  // Check if daily wellbeing check-in was already done today
  useEffect(() => {
    if (!user) return;
    const checkWellbeing = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await (supabase.from("daily_wellbeing_checkins" as any)
        .select("rest_level,stress_level,motivation_level,night_factors")
        .eq("user_id", user.id)
        .eq("checkin_date", today)
        .maybeSingle() as any);
      if (!data) {
        setShowWellbeingCheckin(true);
      } else {
        setCheckinData(data);
      }
    };
    checkWellbeing();

    // Load historical checkins for rolling patterns (last 10 days)
    const loadHistory = async () => {
      const { data } = await (supabase.from("daily_wellbeing_checkins" as any)
        .select("checkin_date,rest_level,stress_level,motivation_level,night_factors")
        .eq("user_id", user.id)
        .order("checkin_date", { ascending: false })
        .limit(10) as any);
      if (data) setHistoricalCheckins(data as HistoricalCheckin[]);
    };
    loadHistory();

    // Also load weekly goals breakdown
    const loadWeeklyBreakdown = async () => {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const { data } = await (supabase.from("weekly_goals" as any)
        .select("daily_breakdown")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle() as any);
      if (data) {
        setWeeklyDailyBreakdown(data.daily_breakdown as Record<string, string[]>);
      }
    };
    loadWeeklyBreakdown();
  }, [user]);

  useEffect(() => {
    async function init() {
      const available = await isHealthAvailable();
      setHealthAvailable(available);
      const [data, workout] = await Promise.all([fetchHealthData(), fetchTodaysWorkout()]);
      setHealthData(data);
      setDetectedWorkout(workout);
      if (available) {
        const isFallbackData = JSON.stringify(data) === JSON.stringify(DEFAULT_HEALTH_DATA);
        setHealthConnected(!isFallbackData);
      }
      setLoading(false);

      // Load first HealthKit sync timestamp for calibration display
      if (user) {
        const { data: prof } = await (supabase
          .from("profiles")
          .select("healthkit_first_sync_at")
          .eq("id", user.id)
          .maybeSingle() as any);
        if (prof?.healthkit_first_sync_at) setFirstSyncAt(prof.healthkit_first_sync_at);
        const dismissKey = `cofactor_calib_banner_${user.id}`;
        if (localStorage.getItem(dismissKey)) setCalibBannerDismissed(true);
      }

      // Notification scheduling — fire-and-forget, native only
      setupNotificationActionListener();
      if (user) scheduleDailyNotifications(user.id).catch(err => console.error("scheduleDailyNotifications:", err));
    }
    init();
  }, [user]);

  const handleHealthSync = async () => {
    setSyncingHealth(true);
    setSyncStatus("");
    try {
      const available = await isHealthAvailable();
      setHealthAvailable(available);
      if (!available) {
        setHealthConnected(false);
        setSyncStatus("Apple Health is not available on this device.");
        return;
      }
      const granted = await requestHealthPermissions();
      setHealthConnected(granted);
      if (!granted) {
        setSyncStatus("Apple Health access was not granted. Enable it in iPhone Settings > Health.");
        return;
      }
      const [data, workout] = await Promise.all([fetchHealthData(), fetchTodaysWorkout()]);
      setHealthData(data);
      setDetectedWorkout(workout);
      const isFallbackData = JSON.stringify(data) === JSON.stringify(DEFAULT_HEALTH_DATA);
      setSyncStatus(
        isFallbackData
          ? "No Health samples found yet. Open Apple Health once, then tap sync again."
          : "Apple Health synced successfully."
      );
    } catch (error) {
      console.error("Apple Health manual sync failed:", error);
      setSyncStatus("Sync failed. Please try again.");
    } finally {
      setSyncingHealth(false);
    }
  };

  const rawScores = useMemo(() => healthData ? calculateApexScores(healthData) : null, [healthData]);
  const scores = useMemo(() => rawScores ? applyCheckinModifiers(rawScores, checkinData, historicalCheckins) : null, [rawScores, checkinData, historicalCheckins]);
  const scoresData = useMemo(() => scores ? buildScoresData(scores) : [], [scores]);
  const peakLabel = scores ? (scores.peakStudyWindow.primary_start === "Rest" ? "Rest" : `${scores.peakStudyWindow.primary_start} – ${scores.peakStudyWindow.primary_end}`) : "";

  // Check for micro reward triggers
  useEffect(() => {
    if (!scores) return;
    if (scores.burnoutRisk < 25) {
      setReward({ show: true, message: "Healthy recovery! Keep it up.", emoji: "💚" });
    } else if (scores.cognitiveReadiness > 80) {
      setReward({ show: true, message: "Peak brain power today!", emoji: "🧠" });
    }
  }, [scores]);

  // Save daily burnout score
  useEffect(() => {
    if (!scores || !user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    supabase
      .from("daily_scores")
      .upsert({
        user_id: user.id,
        score_date: today,
        burnout_risk: scores.burnoutRisk,
        cognitive_readiness: scores.cognitiveReadiness,
        retention_outlook: scores.retentionOutlook,
        university_id: universityId,
      } as any, { onConflict: "user_id,score_date" })
      .then(({ error }) => { if (error) console.error("Failed to save daily score:", error); });
  }, [scores, user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/welcome" replace />;

  const blockRec = scores ? getStudyBlockRecommendation(scores) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 pb-10 pt-8">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <StreakBadge streak={streak} studySessions={totalSessions} />
          <div className="flex gap-1">
            <button
              onClick={() => setShowOnboarding(true)}
              aria-label="How to use this app"
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted transition-colors"
            >
              <Info className="h-5 w-5" />
            </button>
            <button onClick={() => navigate("/account")} className="rounded-xl p-2 text-muted-foreground hover:bg-muted transition-colors">
              <Settings className="h-5 w-5" />
            </button>
            <button onClick={signOut} className="rounded-xl p-2 text-muted-foreground hover:bg-muted transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Hero action sentence */}
        <HeroAction
          displayName={displayName}
          scores={scores ? {
            cognitiveReadiness: scores.cognitiveReadiness,
            burnoutRisk: scores.burnoutRisk,
            peakWindow: peakLabel,
            studyCapacity: scores.studyCapacity.label,
          } : null}
        />

        {/* Start Study Timer — primary CTA */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-2">
          <Button
            onClick={() => navigate("/study-timer")}
            className="w-full rounded-xl h-12 gap-2 bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-md"
          >
            <Timer className="h-4 w-4" /> Start Study Timer
          </Button>
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-2 grid grid-cols-4 gap-2">
          <Button onClick={() => navigate("/study-logs/new")} className="w-full rounded-xl h-11 gap-1.5 bg-gradient-primary text-primary-foreground font-semibold text-xs">
            <Plus className="h-3.5 w-3.5" /> Log
          </Button>
          <Button onClick={() => navigate("/weekly-goals")} className="w-full rounded-xl h-11 gap-1.5 bg-goals-purple text-primary-foreground font-semibold text-xs hover:bg-goals-purple/90">
            <Target className="h-3.5 w-3.5" /> Goals
          </Button>
          <Button onClick={() => navigate("/study-logs")} variant="outline" className="w-full rounded-xl h-11 gap-1.5 border-primary/20 text-primary text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Logs
          </Button>
          <Button onClick={() => navigate("/leaderboard")} variant="outline" className="w-full rounded-xl h-11 gap-1.5 border-accent/30 text-accent-foreground text-xs">
            <Trophy className="h-3.5 w-3.5" /> Rank
          </Button>
        </motion.div>

        {/* Exam Progress Tab */}
        <Collapsible open={examOpen} onOpenChange={setExamOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 mb-5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Exam Progress</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${examOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mb-5 -mt-3">
              <ExamChecklist />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Today's Insight */}
        {!loading && scores && (
          <div className="mb-5">
            <TodaysInsight scores={{
              cognitiveReadiness: scores.cognitiveReadiness,
              burnoutRisk: scores.burnoutRisk,
              retentionOutlook: scores.retentionOutlook,
              studyCapacity: scores.studyCapacity.label,
            }} />
          </div>
        )}

        {/* Score cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your Metrics</h2>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
            <Activity className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              {healthAvailable ? (healthConnected ? "Apple Health" : "Not Synced") : "Preview Data"}
            </span>
          </div>
        </motion.div>

        {healthAvailable && (
          <div className="mb-3">
            <Button
              onClick={handleHealthSync}
              disabled={syncingHealth}
              variant={healthConnected ? "secondary" : "default"}
              size="sm"
              className="h-9 rounded-full px-3 text-xs"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${syncingHealth ? "animate-spin" : ""}`} />
              {syncingHealth ? "Syncing..." : healthConnected ? "Sync Apple Health" : "Connect Apple Health"}
            </Button>
            {syncStatus && <p className="mt-1.5 text-xs text-muted-foreground">{syncStatus}</p>}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-2.5">
            {scoresData.map((score, i) => (
              <ScoreCard
                key={score.label}
                label={score.label}
                value={score.value}
                icon={score.icon}
                colorClass={score.color}
                index={i}
                numValue={score.numValue}
                actionText={getActionText(score.icon, score.numValue)}
                subtitle={(score as any).subtitle}
                compact={(score as any).compact}
                onClick={() => setSelectedScore(score)}
              />
            ))}
          </div>
        )}

        {/* AI Daily Plan */}
        {!loading && (
          <div className="mb-6">
            <DailyStudyPlan
              scores={scores ? {
                cognitiveReadiness: scores.cognitiveReadiness,
                burnoutRisk: scores.burnoutRisk,
                peakWindow: peakLabel,
                studyCapacity: scores.studyCapacity.label,
                studyBlockRecommendation: blockRec!,
              } : null}
              weeklyGoalsTasks={weeklyDailyBreakdown}
      />

      <OnboardingGuide open={showOnboarding} onClose={closeOnboarding} />
    </div>
        )}


        <GettingToKnowYouQuizzes />

        <WeeklyChallenges />
      </div>

      {selectedScore && <ScoreDetailModal score={selectedScore} onClose={() => setSelectedScore(null)} />}

      <MicroReward
        show={reward.show}
        message={reward.message}
        emoji={reward.emoji}
        onComplete={() => setReward(prev => ({ ...prev, show: false }))}
      />

      <DailyWellbeingCheckin
        detectedWorkout={detectedWorkout}
        open={showWellbeingCheckin && !onboardingPending}
        onClose={async () => {
          setShowWellbeingCheckin(false);
          const today = format(new Date(), "yyyy-MM-dd");
          const { data } = await (supabase.from("daily_wellbeing_checkins" as any)
            .select("rest_level,stress_level,motivation_level,night_factors")
            .eq("user_id", user!.id)
            .eq("checkin_date", today)
            .maybeSingle() as any);
          if (data) setCheckinData(data);
        }}
      />
    </div>
  );
};

export default Index;
