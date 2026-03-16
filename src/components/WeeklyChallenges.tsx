import { useState, useEffect } from "react";
import PatientCharacter from "@/components/PatientCharacter";

interface Challenge {
  id: string;
  title: string;
  xp: number;
  emoji: string;
}

const CONDITIONS = [
  { label: "Fractured ankle" },
  { label: "Broken arm" },
  { label: "Head wound" },
  { label: "Black eye" },
  { label: "Knee sprain" },
  { label: "Laceration" },
];

const CHALLENGES: Challenge[] = [
  { id: "c1", title: "Review Anki deck 5 days in a row", xp: 60, emoji: "🃏" },
  { id: "c2", title: "Create notes for a new topic", xp: 50, emoji: "📓" },
  { id: "c3", title: "Add 20 new cards to your deck", xp: 55, emoji: "➕" },
  { id: "c4", title: "Score 70%+ on a practice quiz", xp: 80, emoji: "📝" },
  { id: "c5", title: "Review and revise last week's notes", xp: 65, emoji: "🔄" },
  { id: "c6", title: "Clear your full Anki due queue", xp: 90, emoji: "✅" },
];

export default function WeeklyChallenges() {
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [healingIdx, setHealingIdx] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  const completedCount = completedSet.size;
  const totalXP = CHALLENGES
    .filter((c) => completedSet.has(c.id))
    .reduce((sum, c) => sum + c.xp, 0);
  const allDone = completedCount >= 6;

  useEffect(() => {
    if (healingIdx === null || !pendingId) return;
    const t = setTimeout(() => {
      setCompletedSet((prev) => new Set([...prev, pendingId]));
      setHealingIdx(null);
      setPendingId(null);
      setAnimating(false);
    }, 780);
    return () => clearTimeout(t);
  }, [healingIdx, pendingId]);

  const handleToggle = (id: string) => {
    if (animating) return;
    if (completedSet.has(id)) {
      const next = new Set(completedSet);
      next.delete(id);
      setCompletedSet(next);
      return;
    }
    const prevCount = completedSet.size;
    setAnimating(true);
    setPendingId(id);
    setHealingIdx(prevCount);
  };

  return (
    <div className="rounded-3xl bg-card p-5 shadow-card overflow-hidden">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏥</span>
            <h3 className="font-display text-lg font-bold text-foreground">
              Weekly Challenges
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground font-mono">
            {completedCount}/6 challenges completed
          </p>
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/25 px-3 py-1 text-xs font-semibold text-primary font-mono">
          +{totalXP} XP
        </span>
      </div>

      {/* Patient card */}
      <div className="rounded-2xl bg-muted/40 border border-border p-4 mb-3">
        {allDone && (
          <div
            className="rounded-xl bg-primary/10 border border-primary/25 px-3.5 py-2 text-center mb-3.5 text-xs font-semibold text-primary"
            style={{ animation: "apexSlide 0.4s ease" }}
          >
            🎉 Patient fully recovered — outstanding work this week!
          </div>
        )}

        <div className="flex items-center gap-3.5">
          <div className="shrink-0">
            <PatientCharacter completedCount={completedCount} healingIdx={healingIdx} />
          </div>

          {/* Condition list */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2.5 font-mono">
              Patient Status
            </p>
            {CONDITIONS.map((cond, i) => {
              const healed = completedCount > i;
              const justHealed = healingIdx === i;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 mb-1.5"
                  style={{
                    opacity: healed ? 1 : 0.4,
                    animation: justHealed ? "apexSlide 0.4s ease" : "none",
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                      healed
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/20 bg-transparent"
                    }`}
                  >
                    {healed && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-[11.5px] truncate transition-colors duration-300 ${
                      healed ? "text-primary line-through" : "text-muted-foreground"
                    }`}
                  >
                    {cond.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-muted overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-primary transition-[width] duration-600 ease-out"
          style={{ width: `${(completedCount / 6) * 100}%` }}
        />
      </div>

      {/* Challenge cards */}
      <div className="flex flex-col gap-2">
        {CHALLENGES.map((challenge, i) => {
          const isDone = completedSet.has(challenge.id);
          const healedCond = isDone && completedCount > i ? CONDITIONS[i] : null;
          return (
            <button
              key={challenge.id}
              onClick={() => handleToggle(challenge.id)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left transition-all duration-200 ${
                isDone
                  ? "bg-primary/5 border-primary/15"
                  : "bg-muted/30 border-border hover:bg-muted/60 hover:-translate-y-px"
              }`}
              style={{
                cursor: animating ? "not-allowed" : "pointer",
                animation: pendingId === challenge.id && animating ? "apexPulse 0.7s ease infinite" : "none",
              }}
              disabled={animating && pendingId !== challenge.id}
            >
              {/* Checkbox */}
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isDone
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/25 bg-transparent"
                }`}
                style={{ animation: isDone ? "apexCheck 0.4s ease" : "none" }}
              >
                {isDone && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px]">{challenge.emoji}</span>
                  <span
                    className={`text-[13px] truncate transition-colors duration-200 ${
                      isDone ? "text-primary/50 line-through" : "text-foreground"
                    }`}
                  >
                    {challenge.title}
                  </span>
                </div>
                {healedCond && (
                  <p
                    className="text-[10.5px] text-primary mt-0.5"
                    style={{ animation: "apexSlide 0.35s ease" }}
                  >
                    🩺 Healed: {healedCond.label}
                  </p>
                )}
              </div>

              {/* XP badge */}
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-mono shrink-0 border ${
                  isDone
                    ? "bg-primary/10 border-primary/25 text-primary"
                    : "bg-muted/50 border-border text-muted-foreground"
                }`}
              >
                +{challenge.xp}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
