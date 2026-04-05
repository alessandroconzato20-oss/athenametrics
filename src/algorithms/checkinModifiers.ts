// Multiplicative daily modifiers + rolling pattern penalties from wellbeing check-ins
// Applied as temporary daily adjustments to ApexScores

import type { ApexScores } from "./apexScores";

export interface CheckinData {
  rest_level: number;       // 1-5
  stress_level: number;     // 1-4
  motivation_level: number; // 1-5
  night_factors: string[];
}

export interface HistoricalCheckin {
  checkin_date: string;
  rest_level: number;
  stress_level: number;
  motivation_level: number;
  night_factors: string[];
}

// ─────────────────────────────────────────────
// DAILY MULTIPLIERS (applied via multiplication)
// ─────────────────────────────────────────────

// Q1: How rested do you feel?
const REST_MULTIPLIERS: Record<number, { cr: number; sc: number; ro: number; br: number }> = {
  1: { cr: 0.70, sc: 0.75, ro: 0.80, br: 1.15 }, // Exhausted
  2: { cr: 0.85, sc: 0.88, ro: 0.90, br: 1.08 }, // Tired
  3: { cr: 1.00, sc: 1.00, ro: 1.00, br: 1.00 }, // Okay
  4: { cr: 1.08, sc: 1.08, ro: 1.05, br: 0.95 }, // Rested
  5: { cr: 1.15, sc: 1.12, ro: 1.08, br: 0.90 }, // Great
};

// Q2: How stressed or anxious do you feel?
const STRESS_MULTIPLIERS: Record<number, { cr: number; br: number; sc: number; peakNarrowMin: number }> = {
  1: { cr: 1.05, br: 0.92, sc: 1.00, peakNarrowMin: 0 },   // Calm
  2: { cr: 0.95, br: 1.05, sc: 0.95, peakNarrowMin: 0 },   // Mild
  3: { cr: 0.82, br: 1.22, sc: 0.88, peakNarrowMin: 45 },  // Stressed
  4: { cr: 0.72, br: 1.35, sc: 0.80, peakNarrowMin: 75 },  // Very Stressed
};

// Q3: How motivated do you feel to study today?
const MOTIVATION_MULTIPLIERS: Record<number, { sc: number; br: number; cr: number }> = {
  1: { sc: 0.70, br: 1.25, cr: 0.95 }, // Not at all
  2: { sc: 0.85, br: 1.12, cr: 0.97 }, // Low
  3: { sc: 1.00, br: 1.00, cr: 1.00 }, // Average
  4: { sc: 1.12, br: 0.92, cr: 1.03 }, // Motivated
  5: { sc: 1.20, br: 0.85, cr: 1.05 }, // Very motivated
};

// Q4: Night factors — each contributes independently (multiplicative, stackable)
const NIGHT_FACTOR_MULTIPLIERS: Record<string, { cr: number; sc: number; ro: number; br: number; peakShiftMin: number; recommendRest: boolean }> = {
  alcohol:  { cr: 0.80, sc: 0.85, ro: 0.60, br: 1.12, peakShiftMin: 0,  recommendRest: false },
  caffeine: { cr: 0.90, sc: 1.00, ro: 0.85, br: 1.00, peakShiftMin: 50, recommendRest: false },
  screen:   { cr: 0.92, sc: 1.00, ro: 0.88, br: 1.00, peakShiftMin: 35, recommendRest: false },
  stress:   { cr: 0.80, sc: 1.00, ro: 0.85, br: 1.20, peakShiftMin: 0,  recommendRest: false },
  unwell:   { cr: 0.65, sc: 0.70, ro: 0.75, br: 1.20, peakShiftMin: 0,  recommendRest: true  },
};

// ─────────────────────────────────────────────
// ROLLING PATTERN CALCULATIONS
// ─────────────────────────────────────────────

// 7-day weighted restedness average (recent days weighted more)
// Weights: day 0 (oldest) = 1, day 6 (most recent, today) = 4
function calc7dRestAverage(checkins: HistoricalCheckin[]): number {
  if (checkins.length === 0) return 3; // neutral
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const last7 = sorted.slice(-7);
  const weights = last7.map((_, i) => 1 + (3 * i / Math.max(last7.length - 1, 1)));
  let wSum = 0, wTotal = 0;
  last7.forEach((c, i) => {
    wSum += c.rest_level * weights[i];
    wTotal += weights[i];
  });
  return wSum / wTotal; // 1-5 scale
}

// 10-day cumulative stress load (higher = worse)
// Each day's stress is mapped: 1→0, 2→1, 3→3, 4→5 then summed
function calc10dStressLoad(checkins: HistoricalCheckin[]): number {
  const stressMap: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 5 };
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const last10 = sorted.slice(-10);
  return last10.reduce((sum, c) => sum + (stressMap[c.stress_level] ?? 1), 0);
}

// 7-day motivational erosion score
// Low motivation days accumulate; high motivation days recover
// Score 0 = neutral, positive = erosion (bad)
function calc7dMotivationErosion(checkins: HistoricalCheckin[]): number {
  const motMap: Record<number, number> = { 1: 3, 2: 1.5, 3: 0, 4: -1, 5: -2 };
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const last7 = sorted.slice(-7);
  return last7.reduce((sum, c) => sum + (motMap[c.motivation_level] ?? 0), 0);
}

// Convert rolling indicators to penalty multipliers
// Recovery rule: one good day reduces accumulated penalty by 25%
function rollingPenalties(
  restAvg: number,
  stressLoad: number,
  motivationErosion: number
): { cr: number; sc: number; ro: number; br: number; allNegative: boolean } {
  // Rest: neutral at 3.0, penalty below
  // restAvg ranges 1-5, penalty when < 3
  const restDeficit = Math.max(0, 3 - restAvg); // 0-2 range
  const restPenalty = restDeficit * 0.06; // up to ~12% penalty

  // Stress: 10-day load, neutral at ~10 (avg mild stress)
  // Max possible = 50 (10 days × 5), concerning above 20
  const stressExcess = Math.max(0, stressLoad - 10);
  const stressPenalty = Math.min(stressExcess * 0.008, 0.25); // up to 25% penalty

  // Motivation: erosion > 0 means net negative
  const motPenalty = Math.min(Math.max(0, motivationErosion) * 0.025, 0.20); // up to 20%

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

const METRIC_FLOOR = 15;

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
  const stress = STRESS_MULTIPLIERS[checkin.stress_level] ?? STRESS_MULTIPLIERS[2];
  const motivation = MOTIVATION_MULTIPLIERS[checkin.motivation_level] ?? MOTIVATION_MULTIPLIERS[3];

  // Night factors: multiply all together
  let nightCr = 1, nightSc = 1, nightRo = 1, nightBr = 1;
  let peakShiftMin = 0, recommendRest = false;
  for (const f of (checkin.night_factors ?? [])) {
    const mod = NIGHT_FACTOR_MULTIPLIERS[f];
    if (!mod) continue;
    nightCr *= mod.cr;
    nightSc *= mod.sc;
    nightRo *= mod.ro;
    nightBr *= mod.br;
    peakShiftMin += mod.peakShiftMin;
    if (mod.recommendRest) recommendRest = true;
  }

  // Combine daily multipliers (all multiplicative)
  let crMul = rest.cr * stress.cr * motivation.cr * nightCr;
  let scMul = rest.sc * stress.sc * motivation.sc * nightSc;
  let roMul = rest.ro * nightRo;
  let brMul = rest.br * stress.br * motivation.br * nightBr;

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

    // ── Step 3: Convergence multiplier ──
    if (rolling.allNegative) {
      // All three indicators in danger zone — compound burnout risk
      brMul *= 1.25;
      crMul *= 0.90;
      scMul *= 0.85;
    }
  }

  // ── Step 4: Apply multipliers with floor ──
  const cr = clampMetric(scores.cognitiveReadiness * crMul);
  const bo = clampMetric(scores.burnoutRisk * brMul);
  const ro = clampMetric(scores.retentionOutlook * roMul);

  const totalMinutes = Math.max(
    Math.round(METRIC_FLOOR / 100 * 9 * 60), // floor equivalent
    Math.min(9 * 60, Math.round(scores.studyCapacity.totalMinutes * scMul))
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
