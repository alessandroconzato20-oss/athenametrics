import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Pause, Play, Square, BookOpen, MapPin, GraduationCap,
  Brain, AlertTriangle, Eye, Zap, Coffee,
} from "lucide-react";
import { toast } from "sonner";
import { type Course } from "@/data/curriculum";
import { useStudentCourses } from "@/hooks/useStudentCourses";

type Step = "setup" | "timer" | "review";

const STUDY_METHODS = [
  { id: "anki", label: "Anki Flashcards", icon: "🃏" },
  { id: "notes", label: "Notes", icon: "📝" },
  { id: "pomodoro", label: "Pomodoro", icon: "🍅" },
  { id: "active-recall", label: "Active Recall", icon: "🧠" },
  { id: "practice-problems", label: "Practice Problems", icon: "✏️" },
  { id: "lectures", label: "Lectures / Videos", icon: "🎬" },
];

const LOCATIONS = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "library", label: "Library", icon: "📚" },
  { id: "cafe", label: "Café", icon: "☕" },
  { id: "other", label: "Other", icon: "📍" },
];

const ACTIVE_KEY = "study_timer_active_v1";

interface PauseEntry { pause_start: string; pause_end?: string }

interface ActiveSessionState {
  sessionId: string;
  subject: string;
  studyMethod: string;
  location: string;
  locationOther?: string;
  sessionStartAt: string; // ISO
  pauseLog: PauseEntry[];
  paused: boolean;
  plannedDurationMinutes: number;
  backgroundAwaySeconds: number;
  backgroundAwayCount: number;
}

const DURATION_PRESETS = [25, 50, 90];
const BACKGROUND_PAUSE_THRESHOLD_SEC = 60;

const fmtHMS = (totalSec: number) => {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const fmtHMShort = (totalSec: number) => {
  const m = Math.floor(totalSec / 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h > 0) return `${h} hour${h > 1 ? "s" : ""} ${min} minute${min !== 1 ? "s" : ""}`;
  return `${min} minute${min !== 1 ? "s" : ""}`;
};

const LevelPicker = ({ label, value, onChange, color, icon }: {
  label: string; value: number; onChange: (v: number) => void; color: string; icon: React.ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      {icon}
      <Label className="text-sm font-medium">{label}</Label>
    </div>
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((lvl) => (
        <motion.button
          key={lvl} type="button" whileTap={{ scale: 0.9 }}
          onClick={() => onChange(lvl)}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            value === lvl ? `${color} shadow-soft scale-105` : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {lvl}
        </motion.button>
      ))}
    </div>
  </div>
);

const StudyTimer = () => {
  const { user, universityId } = useAuth();
  const navigate = useNavigate();
  const userYear = user?.user_metadata?.year || 1;
  

  const [step, setStep] = useState<Step>("setup");

  // ---------- Setup state ----------
  const [subject, setSubject] = useState("");
  const [studyMethod, setStudyMethod] = useState("");
  const [location, setLocation] = useState("");
  const [locationOther, setLocationOther] = useState("");
  const [plannedDuration, setPlannedDuration] = useState<number>(50);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [medianDuration, setMedianDuration] = useState<number | null>(null);

  const { courses: availableCourses } = useStudentCourses({ mergeSyllabi: true });

  // Load personal median session length (≥5 completed sessions)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("study_sessions")
        .select("active_duration_seconds")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("session_start_at", { ascending: false })
        .limit(30);
      if (data && data.length >= 5) {
        const mins = data
          .map((r: any) => Math.round((r.active_duration_seconds ?? 0) / 60))
          .filter((m) => m >= 5)
          .sort((a, b) => a - b);
        if (mins.length >= 5) {
          const median = mins[Math.floor(mins.length / 2)];
          setMedianDuration(median);
          // Snap default to closest preset, or use median directly
          const closest = DURATION_PRESETS.reduce((p, c) => Math.abs(c - median) < Math.abs(p - median) ? c : p);
          setPlannedDuration(Math.abs(closest - median) <= 10 ? closest : median);
        }
      }
    })();
  }, [user]);

  // ---------- Live timer state ----------
  const [active, setActive] = useState<ActiveSessionState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showBreakNudge, setShowBreakNudge] = useState(false);
  const breakNudgedRef = useRef(false);

  // Restore unfinished session
  useEffect(() => {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ActiveSessionState;
      setActive(parsed);
      setStep("timer");
    } catch {}
  }, []);

  // Tick
  useEffect(() => {
    if (step !== "timer" || !active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step, active]);

  // Persist active session
  useEffect(() => {
    if (active && step === "timer") {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
    }
  }, [active, step]);

  const computeDurations = useCallback((s: ActiveSessionState, atMs: number) => {
    const startMs = new Date(s.sessionStartAt).getTime();
    const elapsed = Math.max(0, Math.floor((atMs - startMs) / 1000));
    let pauseSec = 0;
    let lastPauseStart = 0;
    for (const p of s.pauseLog) {
      const ps = new Date(p.pause_start).getTime();
      const pe = p.pause_end ? new Date(p.pause_end).getTime() : atMs;
      pauseSec += Math.max(0, Math.floor((pe - ps) / 1000));
      if (!p.pause_end) lastPauseStart = ps;
    }
    const active_seconds = Math.max(0, elapsed - pauseSec);
    // Continuous active streak (since last resume / start)
    const lastResumeMs = s.pauseLog.length
      ? (s.pauseLog[s.pauseLog.length - 1].pause_end
          ? new Date(s.pauseLog[s.pauseLog.length - 1].pause_end!).getTime()
          : lastPauseStart)
      : startMs;
    const continuous_active_seconds = s.paused ? 0 : Math.max(0, Math.floor((atMs - lastResumeMs) / 1000));
    return { elapsed, pauseSec, active_seconds, continuous_active_seconds };
  }, []);

  const durations = active ? computeDurations(active, now) : null;

  // 90-minute break nudge
  useEffect(() => {
    if (!active || !durations) return;
    if (durations.continuous_active_seconds >= 90 * 60 && !breakNudgedRef.current) {
      breakNudgedRef.current = true;
      setShowBreakNudge(true);
    }
  }, [durations, active]);



  // Background auto-pause: if app is hidden/backgrounded >60s mid-session, auto-pause
  // and log the away segment toward the session_abandonment signal.
  useEffect(() => {
    if (step !== "timer" || !active) return;
    let hiddenAt: number | null = null;
    let timerId: number | null = null;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (active.paused) return;
        hiddenAt = Date.now();
        // Schedule auto-pause after threshold
        timerId = window.setTimeout(() => {
          setActive((prev) => {
            if (!prev || prev.paused) return prev;
            const nowISO = new Date().toISOString();
            return {
              ...prev,
              paused: true,
              pauseLog: [...prev.pauseLog, { pause_start: nowISO }],
            };
          });
        }, BACKGROUND_PAUSE_THRESHOLD_SEC * 1000);
      } else {
        // Returned
        if (timerId) { clearTimeout(timerId); timerId = null; }
        if (hiddenAt) {
          const awaySec = Math.floor((Date.now() - hiddenAt) / 1000);
          hiddenAt = null;
          if (awaySec >= BACKGROUND_PAUSE_THRESHOLD_SEC) {
            setActive((prev) => prev ? {
              ...prev,
              backgroundAwaySeconds: prev.backgroundAwaySeconds + awaySec,
              backgroundAwayCount: prev.backgroundAwayCount + 1,
            } : prev);
            toast.message("Auto-paused while you were away", {
              description: "Tap Resume when you're back.",
            });
          }
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerId) clearTimeout(timerId);
    };
  }, [step, active]);

  // ---------- Setup → Start ----------
  const setupReady = subject && studyMethod && location && (location !== "other" || locationOther.trim());

  const handleStart = async () => {
    if (!user || !setupReady) return;
    const planned = plannedDuration === -1
      ? Math.max(5, Math.min(240, parseInt(customDuration, 10) || 0))
      : plannedDuration;
    if (!planned) {
      toast.error("Pick a session length");
      return;
    }
    const startISO = new Date().toISOString();
    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: user.id,
        university_id: universityId,
        subject,
        study_method: studyMethod,
        location,
        location_other: location === "other" ? locationOther.trim() : null,
        session_start_at: startISO,
        planned_duration_minutes: planned,
        status: "active",
      } as any)
      .select("id")
      .single();
    if (error || !data) {
      toast.error(error?.message || "Could not start session");
      return;
    }
    const newActive: ActiveSessionState = {
      sessionId: data.id,
      subject,
      studyMethod,
      location,
      locationOther: location === "other" ? locationOther.trim() : undefined,
      sessionStartAt: startISO,
      pauseLog: [],
      paused: false,
      plannedDurationMinutes: planned,
      backgroundAwaySeconds: 0,
      backgroundAwayCount: 0,
    };
    setActive(newActive);
    setStep("timer");
    toast.success("Timer started");
  };

  // ---------- Pause / Resume ----------
  const togglePause = () => {
    if (!active) return;
    const nowISO = new Date().toISOString();
    if (active.paused) {
      const log = [...active.pauseLog];
      const last = log[log.length - 1];
      if (last && !last.pause_end) last.pause_end = nowISO;
      setActive({ ...active, paused: false, pauseLog: log });
    } else {
      const log = [...active.pauseLog, { pause_start: nowISO }];
      setActive({ ...active, paused: true, pauseLog: log });
    }
  };

  // ---------- End → Review ----------
  const [endingState, setEndingState] = useState<{
    sessionId: string;
    subject: string;
    studyMethod: string;
    location: string;
    locationOther?: string;
    activeDurationSeconds: number;
  } | null>(null);

  const handleEnd = async () => {
    if (!active || !durations) return;
    const endISO = new Date().toISOString();
    // Close any open pause
    const log = active.pauseLog.map((p) => p.pause_end ? p : { ...p, pause_end: endISO });
    const final = computeDurations({ ...active, pauseLog: log, paused: false }, Date.now());
    const pauseRate = final.active_seconds > 0
      ? (active.pauseLog.length / (final.active_seconds / 3600))
      : 0;

    const plannedSec = active.plannedDurationMinutes * 60;
    const status = final.active_seconds < plannedSec * 0.5 ? "abandoned" : "completed";

    await supabase
      .from("study_sessions")
      .update({
        session_end_at: endISO,
        active_duration_seconds: final.active_seconds,
        total_pause_duration_seconds: final.pauseSec,
        pause_count: active.pauseLog.length,
        pause_rate: Number(pauseRate.toFixed(3)),
        pause_log: log,
        background_away_seconds: active.backgroundAwaySeconds,
        background_away_count: active.backgroundAwayCount,
        status,
      } as any)
      .eq("id", active.sessionId);

    setEndingState({
      sessionId: active.sessionId,
      subject: active.subject,
      studyMethod: active.studyMethod,
      location: active.location,
      locationOther: active.locationOther,
      activeDurationSeconds: final.active_seconds,
    });
    localStorage.removeItem(ACTIVE_KEY);
    setActive(null);
    setShowBreakNudge(false);
    breakNudgedRef.current = false;
    setStep("review");
  };

  // ---------- Review ----------
  const [difficulty, setDifficulty] = useState(3);
  const [comprehension, setComprehension] = useState(3);
  const [revisionPriority, setRevisionPriority] = useState(3);
  const [confidence, setConfidence] = useState(3);
  const [savingReview, setSavingReview] = useState(false);

  const handleSaveReview = async () => {
    if (!endingState) return;
    setSavingReview(true);
    const { error } = await supabase
      .from("study_sessions")
      .update({
        difficulty, comprehension,
        revision_priority: revisionPriority,
        confidence,
        post_session_completed: true,
      } as any)
      .eq("id", endingState.sessionId);
    setSavingReview(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Session saved 🎉");
    navigate("/study-logs");
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 pb-10 pt-6">
        {step === "setup" && (
          <SetupScreen
            onBack={() => navigate(-1)}
            availableCourses={availableCourses}
            subject={subject} setSubject={setSubject}
            studyMethod={studyMethod} setStudyMethod={setStudyMethod}
            location={location} setLocation={setLocation}
            locationOther={locationOther} setLocationOther={setLocationOther}
            plannedDuration={plannedDuration} setPlannedDuration={setPlannedDuration}
            customDuration={customDuration} setCustomDuration={setCustomDuration}
            medianDuration={medianDuration}
            ready={!!setupReady}
            onStart={handleStart}
          />
        )}

        {step === "timer" && active && durations && (
          <TimerScreen
            active={active}
            elapsedSec={durations.elapsed}
            activeSec={durations.active_seconds}
            paused={active.paused}
            onTogglePause={togglePause}
            onEnd={handleEnd}
            showBreakNudge={showBreakNudge}
            onPauseFromNudge={() => { setShowBreakNudge(false); if (!active.paused) togglePause(); }}
            onDismissNudge={() => setShowBreakNudge(false)}
          />
        )}

        {step === "review" && endingState && (
          <ReviewScreen
            summary={endingState}
            difficulty={difficulty} setDifficulty={setDifficulty}
            comprehension={comprehension} setComprehension={setComprehension}
            revisionPriority={revisionPriority} setRevisionPriority={setRevisionPriority}
            confidence={confidence} setConfidence={setConfidence}
            saving={savingReview}
            onSave={handleSaveReview}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================
// SCREEN 1 — Setup
// ============================================================
const SetupScreen = ({
  onBack, availableCourses, subject, setSubject, studyMethod, setStudyMethod,
  location, setLocation, locationOther, setLocationOther,
  plannedDuration, setPlannedDuration, customDuration, setCustomDuration, medianDuration,
  ready, onStart,
}: any) => {
  const durationReady = plannedDuration > 0 && (plannedDuration !== -1 || (parseInt(customDuration, 10) >= 5));
  const dots = [
    !!subject,
    !!studyMethod,
    !!location && (location !== "other" || locationOther.trim()),
    durationReady,
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-6 flex justify-center gap-2">
        {dots.map((done, i) => (
          <div key={i} className={`h-2 rounded-full transition-all ${done ? "w-8 bg-primary" : "w-2 bg-muted"}`} />
        ))}
      </div>

      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Quick setup</h1>
      <p className="text-sm text-muted-foreground mb-6">A few taps and you're studying.</p>

      <div className="space-y-6">
        {/* Q1 — Subject */}
        <div>
          <Label className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-4 w-4 text-primary" /> What are you studying?
          </Label>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
            {availableCourses.map((c: any) => (
              <motion.button
                key={c.name} type="button" whileTap={{ scale: 0.98 }}
                onClick={() => setSubject(c.name)}
                className={`rounded-xl px-4 py-3 text-sm font-medium text-left transition-all ${
                  subject === c.name ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-foreground hover:bg-muted/70"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{c.name}</span>
                  {(c.isCarryOver || c.isAhead) && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${subject === c.name ? "bg-primary-foreground/20" : c.isCarryOver ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>
                      Y{c.courseYear}{c.isAhead ? " · ahead" : ""}
                    </span>
                  )}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Q2 — Method */}
        <div>
          <Label className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-primary" /> How are you studying?
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {STUDY_METHODS.map((m) => (
              <motion.button
                key={m.id} type="button" whileTap={{ scale: 0.96 }}
                onClick={() => setStudyMethod(m.id)}
                className={`rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                  studyMethod === m.id ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-foreground hover:bg-muted/70"
                }`}
              >
                <span className="mr-1.5">{m.icon}</span>{m.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Q3 — Location */}
        <div>
          <Label className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-primary" /> Where are you studying?
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {LOCATIONS.map((l) => (
              <motion.button
                key={l.id} type="button" whileTap={{ scale: 0.95 }}
                onClick={() => setLocation(l.id)}
                className={`rounded-xl px-2 py-3 text-xs font-medium transition-all ${
                  location === l.id ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-foreground hover:bg-muted/70"
                }`}
              >
                <div className="text-lg leading-none mb-1">{l.icon}</div>
                {l.label}
              </motion.button>
            ))}
          </div>
          {location === "other" && (
            <Input
              placeholder="Where?" value={locationOther}
              onChange={(e) => setLocationOther(e.target.value)}
              className="mt-3 h-11 rounded-xl"
            />
          )}
        </div>
      </div>

      <div className="mt-8">
        <Button
          onClick={onStart} disabled={!ready}
          className="h-14 w-full rounded-2xl bg-gradient-primary text-base font-semibold text-primary-foreground"
        >
          Start timer
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Your session will be timed automatically. We'll ask a few questions when you finish.
        </p>
      </div>
    </motion.div>
  );
};

// ============================================================
// SCREEN 2 — Live Timer
// ============================================================
const TimerScreen = ({
  active, elapsedSec, activeSec, paused, onTogglePause, onEnd,
  showBreakNudge, onPauseFromNudge, onDismissNudge,
}: {
  active: ActiveSessionState; elapsedSec: number; activeSec: number; paused: boolean;
  onTogglePause: () => void; onEnd: () => void;
  showBreakNudge: boolean; onPauseFromNudge: () => void; onDismissNudge: () => void;
}) => {
  const methodMeta = STUDY_METHODS.find((m) => m.id === active.studyMethod);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[80vh] flex-col items-center justify-between py-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">{active.subject}</p>
      </div>

      <div className="flex flex-col items-center">
        <motion.div
          key={paused ? "paused" : "running"}
          initial={{ scale: 0.95, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}
          className={`font-display text-6xl sm:text-7xl font-bold tabular-nums tracking-tight ${paused ? "text-muted-foreground" : "text-foreground"}`}
        >
          {fmtHMS(activeSec)}
        </motion.div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-xl">{methodMeta?.icon}</span>
          <span>{methodMeta?.label || active.studyMethod}</span>
        </div>
        {paused && <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">Paused</p>}
      </div>

      <AnimatePresence>
        {showBreakNudge && (
          <motion.div
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl bg-card p-4 shadow-card border border-border"
          >
            <div className="flex items-start gap-3">
              <Coffee className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">You've been going for 90 minutes.</p>
                <p className="text-xs text-muted-foreground mt-1">A short break protects your retention.</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={onPauseFromNudge} className="rounded-xl bg-primary text-primary-foreground">Pause</Button>
                  <Button size="sm" variant="ghost" onClick={onDismissNudge} className="rounded-xl">Dismiss</Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-sm space-y-3">
        <div className="flex gap-3">
          <Button
            onClick={onTogglePause} variant="outline"
            className="flex-1 h-14 rounded-2xl border-2 text-base font-semibold gap-2"
          >
            {paused ? <><Play className="h-5 w-5" /> Resume</> : <><Pause className="h-5 w-5" /> Pause</>}
          </Button>
          <Button
            onClick={onEnd}
            className="flex-1 h-14 rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-base font-semibold gap-2"
          >
            <Square className="h-5 w-5" /> End
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Total elapsed: {fmtHMS(elapsedSec)}
        </p>
      </div>
    </motion.div>
  );
};

// ============================================================
// SCREEN 3 — Post-session review
// ============================================================
const ReviewScreen = ({
  summary, difficulty, setDifficulty, comprehension, setComprehension,
  revisionPriority, setRevisionPriority, confidence, setConfidence, saving, onSave,
}: any) => {
  const methodMeta = STUDY_METHODS.find((m) => m.id === summary.studyMethod);
  const locMeta = LOCATIONS.find((l) => l.id === summary.location);
  const locationLabel = summary.location === "other" ? (summary.locationOther || "Other") : locMeta?.label;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Session complete</h1>
      <p className="text-sm text-muted-foreground mb-5">Quick rating — takes 10 seconds.</p>

      <div className="rounded-2xl bg-card p-4 shadow-card mb-5">
        <p className="font-display text-lg font-bold text-foreground">{summary.subject}</p>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><span className="text-base">{methodMeta?.icon}</span> {methodMeta?.label}</span>
          <span className="flex items-center gap-1"><span className="text-base">{locMeta?.icon || "📍"}</span> {locationLabel}</span>
        </div>
        <p className="mt-3 text-2xl font-display font-bold text-primary">
          {fmtHMShort(summary.activeDurationSeconds)}
        </p>
      </div>

      <div className="rounded-2xl bg-card p-4 space-y-5 shadow-card">
        <LevelPicker label="Difficulty" value={difficulty} onChange={setDifficulty}
          color="bg-score-cognitive text-primary-foreground" icon={<Brain className="h-4 w-4 text-score-cognitive" />} />
        <LevelPicker label="Comprehension" value={comprehension} onChange={setComprehension}
          color="bg-primary text-primary-foreground" icon={<BookOpen className="h-4 w-4 text-primary" />} />
        <LevelPicker label="Revision Priority" value={revisionPriority} onChange={setRevisionPriority}
          color="bg-amber-500 text-white" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
        <LevelPicker label="Confidence" value={confidence} onChange={setConfidence}
          color="bg-green-500 text-white" icon={<Zap className="h-4 w-4 text-green-500" />} />
      </div>

      <Button
        onClick={onSave} disabled={saving}
        className="mt-6 h-14 w-full rounded-2xl bg-gradient-primary text-base font-semibold text-primary-foreground"
      >
        {saving ? "Saving…" : "Save session"}
      </Button>
    </motion.div>
  );
};

export default StudyTimer;
