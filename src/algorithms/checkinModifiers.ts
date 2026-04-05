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

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function applyCheckinModifiers(scores: ApexScores, checkin: CheckinData | null): ApexScores {
  if (!checkin) return scores;

  const rest = REST_MODIFIERS[checkin.rest_level] ?? REST_MODIFIERS[3];

  const cr = clamp(Math.round(scores.cognitiveReadiness * (1 + rest.cr)), 0, 100);
  const bo = clamp(Math.round(scores.burnoutRisk * (1 + rest.br)), 0, 100);
  const ro = clamp(Math.round(scores.retentionOutlook * (1 + rest.ro)), 0, 100);

  // Study capacity: apply modifier to totalMinutes, recompute hours/minutes
  const scFactor = 1 + rest.sc;
  const totalMinutes = clamp(Math.round(scores.studyCapacity.totalMinutes * scFactor), 0, 9 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

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
  };
}
