// Percentage modifiers from daily wellbeing check-in answers
// Applied as temporary daily adjustments to ApexScores

import type { ApexScores } from "./apexScores";

interface CheckinData {
  rest_level: number;       // 1-5
  stress_level: number;     // 1-4
  motivation_level: number; // 1-5
  night_factors: string[];
}

// Q1: How rested do you feel? (values from design spec)
const REST_MODIFIERS: Record<number, { cr: number; sc: number; ro: number; br: number }> = {
  1: { cr: -0.30, sc: -0.25, ro: -0.20, br: +0.15 }, // Exhausted
  2: { cr: -0.15, sc: -0.12, ro: -0.10, br: +0.08 }, // Tired
  3: { cr:  0.00, sc:  0.00, ro:  0.00, br:  0.00 }, // Okay
  4: { cr: +0.08, sc: +0.08, ro: +0.05, br: -0.05 }, // Rested
  5: { cr: +0.15, sc: +0.12, ro: +0.08, br: -0.10 }, // Great
};

// Q2: How stressed or anxious do you feel?
// Peak Study Window narrowing is expressed in minutes removed from each end
const STRESS_MODIFIERS: Record<number, { cr: number; br: number; sc: number; peakNarrowMin: number }> = {
  1: { cr: +0.05, br: -0.08, sc:  0.00, peakNarrowMin: 0 },   // Calm
  2: { cr: -0.05, br: +0.05, sc: -0.05, peakNarrowMin: 0 },   // Mild
  3: { cr: -0.18, br: +0.22, sc: -0.12, peakNarrowMin: 45 },  // Stressed (~1.5h)
  4: { cr: -0.28, br: +0.35, sc: -0.20, peakNarrowMin: 75 },  // Very Stressed (~2.5h)
};

// Q3: How motivated do you feel to study today?
const MOTIVATION_MODIFIERS: Record<number, { sc: number; br: number; cr: number }> = {
  1: { sc: -0.30, br: +0.25, cr: -0.05 }, // Not at all
  2: { sc: -0.15, br: +0.12, cr: -0.03 }, // Low
  3: { sc:  0.00, br:  0.00, cr:  0.00 }, // Average
  4: { sc: +0.12, br: -0.08, cr: +0.03 }, // Motivated
  5: { sc: +0.20, br: -0.15, cr: +0.05 }, // Very motivated
};

// Q4: Night factors — each factor contributes independently (additive, stackable)
const NIGHT_FACTOR_MODIFIERS: Record<string, { cr: number; sc: number; ro: number; br: number; peakShiftMin: number; recommendRest: boolean }> = {
  alcohol:  { cr: -0.20, sc: -0.15, ro: -0.40, br: +0.12, peakShiftMin: 0,  recommendRest: false },
  caffeine: { cr: -0.10, sc:  0.00, ro: -0.15, br:  0.00, peakShiftMin: 50, recommendRest: false },
  screen:   { cr: -0.08, sc:  0.00, ro: -0.12, br:  0.00, peakShiftMin: 35, recommendRest: false },
  stress:   { cr: -0.20, sc:  0.00, ro: -0.15, br: +0.20, peakShiftMin: 0,  recommendRest: false },
  unwell:   { cr: -0.35, sc: -0.30, ro: -0.25, br: +0.20, peakShiftMin: 0,  recommendRest: true  },
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
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

function getNightFactorTotals(factors: string[]) {
  let cr = 0, sc = 0, ro = 0, br = 0, peakShiftMin = 0, recommendRest = false;
  for (const f of factors) {
    const mod = NIGHT_FACTOR_MODIFIERS[f];
    if (!mod) continue;
    cr += mod.cr;
    sc += mod.sc;
    ro += mod.ro;
    br += mod.br;
    peakShiftMin += mod.peakShiftMin;
    if (mod.recommendRest) recommendRest = true;
  }
  return { cr, sc, ro, br, peakShiftMin, recommendRest };
}

export function applyCheckinModifiers(scores: ApexScores, checkin: CheckinData | null): ApexScores {
  if (!checkin) return scores;

  const rest = REST_MODIFIERS[checkin.rest_level] ?? REST_MODIFIERS[3];
  const stress = STRESS_MODIFIERS[checkin.stress_level] ?? STRESS_MODIFIERS[2];
  const motivation = MOTIVATION_MODIFIERS[checkin.motivation_level] ?? MOTIVATION_MODIFIERS[3];
  const night = getNightFactorTotals(checkin.night_factors ?? []);

  // Combine Q1 + Q2 + Q3 + Q4 modifiers additively
  const crMod = rest.cr + stress.cr + motivation.cr + night.cr;
  const brMod = rest.br + stress.br + motivation.br + night.br;
  const scMod = rest.sc + stress.sc + motivation.sc + night.sc;
  const roMod = rest.ro + night.ro;

  const cr = clamp(Math.round(scores.cognitiveReadiness * (1 + crMod)), 0, 100);
  const bo = clamp(Math.round(scores.burnoutRisk * (1 + brMod)), 0, 100);
  const ro = clamp(Math.round(scores.retentionOutlook * (1 + roMod)), 0, 100);

  // Study capacity
  const totalMinutes = clamp(Math.round(scores.studyCapacity.totalMinutes * (1 + scMod)), 0, 9 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Peak study window: narrowing from stress + shifting later from night factors
  const narrow = stress.peakNarrowMin;
  const nightShift = night.peakShiftMin;

  let peakStudyWindow = scores.peakStudyWindow;

  if (night.recommendRest) {
    // "Feeling unwell" overrides window with rest recommendation
    peakStudyWindow = {
      ...peakStudyWindow,
      primary_start: "Rest",
      primary_end: "Rest",
      secondary_start: "Rest",
      secondary_end: "Rest",
    };
  } else {
    const totalShiftStart = (narrow / 2) + nightShift;
    const totalShiftEnd = -(narrow / 2) + nightShift;
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
