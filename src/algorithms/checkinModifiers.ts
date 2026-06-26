// Multiplicative daily modifiers + rolling pattern penalties from wellbeing check-ins
// v2.0.0 — adds motivation/illness/exercise/study-window logic, METRIC_FLOOR=10, MAX_HOURS=8

import type { ApexScores } from "./apexScores";

export interface CheckinData {
  rest_level: number;             // 1-5
  stress_level: number;           // 1-4
  motivation_level: number;       // 1-5
  night_factors: string[];
  did_exercise?: boolean | null;
  exercise_type?: "cardio" | "strength" | "walking" | null;
  exercise_duration_minutes?: number | null;
  study_plan_window?: "within_30" | "1_2h" | "3plus" | "not_today" | null;
  /**
   * Q6 — single-item proxy for MBI-SS emotional exhaustion subscale (1 = not at all, 5 = completely drained).
   * Multiplies burnout risk only; biometrics drive cognitive/study/retention adjustments.
   */
  emotional_exhaustion?: number | null;
}

export interface HistoricalCheckin {
  checkin_date: string;
  rest_level: number;
  stress_level: number;
  motivation_level: number;
  night_factors: string[];
}

// ─────────────────────────────────────────────
// DAILY MULTIPLIERS
// ─────────────────────────────────────────────

// Q1: How rested do you feel?
const REST_MULTIPLIERS: Record<number, { cr: number; sc: number; ro: number; br: number }> = {
  1: { cr: 0.70, sc: 0.75, ro: 0.80, br: 1.15 },
  2: { cr: 0.85, sc: 0.88, ro: 0.90, br: 1.08 },
  3: { cr: 1.00, sc: 1.00, ro: 1.00, br: 1.00 },
  4: { cr: 1.08, sc: 1.08, ro: 1.05, br: 0.95 },
  5: { cr: 1.15, sc: 1.12, ro: 1.08, br: 0.90 },
};

// Q2: Stress — selects row by study_plan_window
// Rows: base | within 30 min | 1–2h | 3+ hours
type StressRow = { cr: number; br: number; sc: number; peakNarrowMin: number };
const STRESS_MULTIPLIERS_BY_WINDOW: Record<string, Record<number, StressRow>> = {
  base: {
    1: { cr: 1.05, br: 0.92, sc: 1.00, peakNarrowMin: 0 },
    2: { cr: 0.95, br: 1.05, sc: 0.95, peakNarrowMin: 0 },
    3: { cr: 0.82, br: 1.22, sc: 0.88, peakNarrowMin: 45 },
    4: { cr: 0.72, br: 1.35, sc: 0.80, peakNarrowMin: 75 },
  },
  within_30: {
    1: { cr: 1.05, br: 0.92, sc: 1.00, peakNarrowMin: 0 },
    2: { cr: 0.92, br: 1.08, sc: 0.92, peakNarrowMin: 15 },
    3: { cr: 0.78, br: 1.28, sc: 0.82, peakNarrowMin: 60 },
    4: { cr: 0.68, br: 1.42, sc: 0.72, peakNarrowMin: 90 },
  },
  "1_2h": {
    1: { cr: 1.05, br: 0.92, sc: 1.00, peakNarrowMin: 0 },
    2: { cr: 0.95, br: 1.05, sc: 0.95, peakNarrowMin: 0 },
    3: { cr: 0.82, br: 1.22, sc: 0.88, peakNarrowMin: 45 },
    4: { cr: 0.72, br: 1.35, sc: 0.80, peakNarrowMin: 75 },
  },
  "3plus": {
    1: { cr: 1.05, br: 0.90, sc: 1.02, peakNarrowMin: 0 },
    2: { cr: 0.97, br: 1.03, sc: 0.97, peakNarrowMin: 0 },
    3: { cr: 0.86, br: 1.18, sc: 0.92, peakNarrowMin: 30 },
    4: { cr: 0.78, br: 1.28, sc: 0.85, peakNarrowMin: 60 },
  },
};

// Q3: Motivation
const MOTIVATION_MULTIPLIERS: Record<number, { cr: number; sc: number; br: number; ro: number }> = {
  1: { cr: 0.85, sc: 0.85, br: 1.15, ro: 0.95 },
  2: { cr: 0.92, sc: 0.92, br: 1.08, ro: 0.98 },
  3: { cr: 1.00, sc: 1.00, br: 1.00, ro: 1.00 },
  4: { cr: 1.03, sc: 1.03, br: 0.95, ro: 1.02 },
  5: { cr: 1.05, sc: 1.05, br: 0.90, ro: 1.03 },
};

// Q4: Night factors (multiplicative, stackable)
const NIGHT_FACTOR_MULTIPLIERS: Record<string, { cr: number; sc: number; ro: number; br: number; peakShiftMin: number; recommendRest: boolean }> = {
  alcohol:  { cr: 0.70, sc: 0.75, ro: 0.65, br: 1.20, peakShiftMin: 0,  recommendRest: false },
  caffeine: { cr: 0.90, sc: 1.00, ro: 0.85, br: 1.00, peakShiftMin: 50, recommendRest: false },
  screen:   { cr: 0.92, sc: 1.00, ro: 0.88, br: 1.00, peakShiftMin: 35, recommendRest: false },
  stress:   { cr: 0.80, sc: 1.00, ro: 0.85, br: 1.20, peakShiftMin: 0,  recommendRest: false },
  unwell:   { cr: 0.65, sc: 0.65, ro: 0.65, br: 1.30, peakShiftMin: 0,  recommendRest: true  },
};

// Q5: Exercise (today) — applied as multiplier on top
function exerciseMultipliers(
  type: CheckinData["exercise_type"],
  durationMin: number
): { cr: number; sc: number; br: number; ro: number } {
  if (!type || !durationMin || durationMin <= 0) {
    return { cr: 1, sc: 1, br: 1, ro: 1 };
  }
  // Saturating duration factor: peaks ~45 min
  const dur = Math.min(durationMin, 90);
  const sat = dur / 45; // 1.0 at 45min, 2.0 at 90min
  const scale = sat <= 1 ? sat : 1 + (sat - 1) * 0.3; // diminishing return after 45min

  if (type === "cardio") {
    // Up to 1.07x
    const peak = 0.07 * Math.min(scale, 1.2);
    return { cr: 1 + peak, sc: 1 + peak * 0.85, br: 1 - peak * 0.6, ro: 1 + peak * 0.4 };
  }
  if (type === "strength") {
    const peak = 0.03 * Math.min(scale, 1.2);
    return { cr: 1 + peak, sc: 1 + peak, br: 1 - peak * 0.5, ro: 1 + peak * 0.3 };
  }
  // walking
  const peak = 0.02 * Math.min(scale, 1.2);
  return { cr: 1 + peak, sc: 1 + peak, br: 1 - peak * 0.4, ro: 1 + peak * 0.2 };
}

// ─────────────────────────────────────────────
// ROLLING PATTERN CALCULATIONS
// ─────────────────────────────────────────────

function calc7dRestAverage(checkins: HistoricalCheckin[]): number {
  if (checkins.length === 0) return 3;
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const last7 = sorted.slice(-7);
  const weights = last7.map((_, i) => 1 + (3 * i / Math.max(last7.length - 1, 1)));
  let wSum = 0, wTotal = 0;
  last7.forEach((c, i) => {
    wSum += c.rest_level * weights[i];
    wTotal += weights[i];
  });
  return wSum / wTotal;
}

function calc10dStressLoad(checkins: HistoricalCheckin[]): number {
  const stressMap: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 5 };
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const last10 = sorted.slice(-10);
  return last10.reduce((sum, c) => sum + (stressMap[c.stress_level] ?? 1), 0);
}

function calc7dMotivationErosion(checkins: HistoricalCheckin[]): number {
  const motMap: Record<number, number> = { 1: 3, 2: 1.5, 3: 0, 4: -1, 5: -2 };
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const last7 = sorted.slice(-7);
  return last7.reduce((sum, c) => sum + (motMap[c.motivation_level] ?? 0), 0);
}

function rollingPenalties(
  restAvg: number,
  stressLoad: number,
  motivationErosion: number
): { cr: number; sc: number; ro: number; br: number; allNegative: boolean } {
  const restDeficit = Math.max(0, 3 - restAvg);
  const restPenalty = restDeficit * 0.06;

  const stressExcess = Math.max(0, stressLoad - 10);
  const stressPenalty = Math.min(stressExcess * 0.008, 0.25);

  const motPenalty = Math.min(Math.max(0, motivationErosion) * 0.025, 0.20);

  const allNegative = restAvg < 2.8 && stressLoad > 15 && motivationErosion > 3;

  return {
    cr: 1 - restPenalty - stressPenalty * 0.5 - motPenalty * 0.3,
    sc: 1 - restPenalty * 0.8 - stressPenalty * 0.3 - motPenalty,
    ro: 1 - restPenalty * 0.6 - stressPenalty * 0.4 - motPenalty * 0.2,
    br: 1 + restPenalty * 0.8 + stressPenalty + motPenalty * 0.6,
    allNegative,
  };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const METRIC_FLOOR = 10;
const MAX_HOURS = 8;

function clampMetric(val: number): number {
  return Math.max(METRIC_FLOOR, Math.min(100, Math.round(val)));
}

function shiftTime(timeStr: string, deltaMinutes: number): string {
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return timeStr;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  let total = h * 60 + m + deltaMinutes;
  total = ((total % 1440) + 1440) % 1440;
  const newH = Math.floor(total / 60);
  const newM = Math.round(total % 60);
  const suffix = newH >= 12 ? "PM" : "AM";
  const h12 = newH % 12 === 0 ? 12 : newH % 12;
  return `${h12}:${newM.toString().padStart(2, "0")} ${suffix}`;
}

function pickStressRow(level: number, window: CheckinData["study_plan_window"]): StressRow {
  if (window === "not_today") {
    // Skip stress modifier entirely — flat 1.00× everywhere
    return { cr: 1.0, br: 1.0, sc: 1.0, peakNarrowMin: 0 };
  }
  const key =
    window === "within_30" ? "within_30" :
    window === "1_2h"      ? "1_2h" :
    window === "3plus"     ? "3plus" :
    "base";
  const table = STRESS_MULTIPLIERS_BY_WINDOW[key];
  return table[level] ?? table[2];
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

export function applyCheckinModifiers(
  scores: ApexScores,
  checkin: CheckinData | null,
  historicalCheckins?: HistoricalCheckin[]
): ApexScores {
  if (!checkin) return scores;

  // ── Step 1: Daily multiplicative adjustments ──
  const rest = REST_MULTIPLIERS[checkin.rest_level] ?? REST_MULTIPLIERS[3];
  const stress = pickStressRow(checkin.stress_level, checkin.study_plan_window ?? null);
  const motivation = MOTIVATION_MULTIPLIERS[checkin.motivation_level] ?? MOTIVATION_MULTIPLIERS[3];
  const ex = exerciseMultipliers(
    checkin.exercise_type ?? null,
    checkin.exercise_duration_minutes ?? 0
  );

  // Night factors: multiply all together
  let nightCr = 1, nightSc = 1, nightRo = 1, nightBr = 1;
  let peakShiftMin = 0, recommendRest = false;
  let illness = false;
  for (const f of (checkin.night_factors ?? [])) {
    const mod = NIGHT_FACTOR_MULTIPLIERS[f];
    if (!mod) continue;
    nightCr *= mod.cr;
    nightSc *= mod.sc;
    nightRo *= mod.ro;
    nightBr *= mod.br;
    peakShiftMin += mod.peakShiftMin;
    if (mod.recommendRest) {
      recommendRest = true;
      illness = true;
    }
  }

  // Combine daily multipliers
  let crMul = rest.cr * stress.cr * motivation.cr * nightCr * ex.cr;
  let scMul = rest.sc * stress.sc * motivation.sc * nightSc * ex.sc;
  let roMul = rest.ro * motivation.ro * nightRo * ex.ro;
  let brMul = rest.br * stress.br * motivation.br * nightBr * ex.br;

  // Q6 — emotional exhaustion (MBI-SS proxy). Burnout multiplier only.
  const EXHAUSTION_BR: Record<number, number> = { 1: 0.90, 2: 0.95, 3: 1.00, 4: 1.15, 5: 1.30 };
  if (checkin.emotional_exhaustion && EXHAUSTION_BR[checkin.emotional_exhaustion]) {
    brMul *= EXHAUSTION_BR[checkin.emotional_exhaustion];
  }

  // Illness override: hard 0.65x on all metrics (and br ≥ 1.30 already)
  if (illness) {
    crMul *= 0.65 / Math.max(nightCr, 0.65); // ensure final illness floor
    scMul *= 0.65 / Math.max(nightSc, 0.65);
    roMul *= 0.65 / Math.max(nightRo, 0.65);
  }

  // ── Step 2: Rolling pattern penalties ──
  const history = historicalCheckins ?? [];
  if (history.length >= 3) {
    const restAvg = calc7dRestAverage(history);
    const stressLoad = calc10dStressLoad(history);
    const motErosion = calc7dMotivationErosion(history);
    const rolling = rollingPenalties(restAvg, stressLoad, motErosion);

    crMul *= rolling.cr;
    scMul *= rolling.sc;
    roMul *= rolling.ro;
    brMul *= rolling.br;

    // Convergence multiplier
    if (rolling.allNegative) {
      brMul *= 1.25;
      crMul *= 0.90;
      scMul *= 0.85;
    }
  }

  // ── Step 3: Apply multipliers with floor ──
  const cr = clampMetric(scores.cognitiveReadiness * crMul);
  const bo = clampMetric(scores.burnoutRisk * brMul);
  const ro = clampMetric(scores.retentionOutlook * roMul);

  const totalMinutes = Math.max(
    Math.round(METRIC_FLOOR / 100 * MAX_HOURS * 60),
    Math.min(MAX_HOURS * 60, Math.round(scores.studyCapacity.totalMinutes * scMul))
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // ── Peak study window adjustments ──
  const narrow = stress.peakNarrowMin;
  let peakStudyWindow = scores.peakStudyWindow;

  if (recommendRest) {
    peakStudyWindow = {
      ...peakStudyWindow,
      primary_start: "Rest",
      primary_end: "Rest",
      secondary_start: "Rest",
      secondary_end: "Rest",
    };
  } else {
    const totalShiftStart = (narrow / 2) + peakShiftMin;
    const totalShiftEnd = -(narrow / 2) + peakShiftMin;
    if (totalShiftStart !== 0 || totalShiftEnd !== 0) {
      peakStudyWindow = {
        ...peakStudyWindow,
        primary_start: shiftTime(peakStudyWindow.primary_start, totalShiftStart),
        primary_end: shiftTime(peakStudyWindow.primary_end, totalShiftEnd),
        secondary_start: shiftTime(peakStudyWindow.secondary_start, totalShiftStart),
        secondary_end: shiftTime(peakStudyWindow.secondary_end, totalShiftEnd),
      };
    }
  }

  return {
    ...scores,
    cognitiveReadiness: cr,
    burnoutRisk: bo,
    retentionOutlook: ro,
    studyCapacity: {
      hours,
      minutes,
      totalMinutes,
      label: minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`,
    },
    peakStudyWindow,
  };
}
