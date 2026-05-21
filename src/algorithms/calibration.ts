// src/algorithms/calibration.ts
// Soft+hard hybrid calibration gating for ApexScores.
// All scores remain visible from day 1, but baseline-dependent scores are
// visually flagged as "calibrating" until enough HealthKit history exists.

export type CalibrationTier = "warming" | "calibrating" | "calibrated";

export interface ScoreCalibration {
  tier: CalibrationTier;
  /** Short pill label, e.g. "Calibrating · 3/30 days" */
  label: string;
  /** Plain-English explanation for the detail modal. */
  explanation: string;
}

export const CALIBRATION_TOTAL_DAYS = 30;

/** Days elapsed since the user's first HealthKit sync. Returns 1 on the sync day. */
export function getCalibrationDays(firstSyncAt: string | Date | null | undefined): number {
  if (!firstSyncAt) return 0;
  const first = typeof firstSyncAt === "string" ? new Date(firstSyncAt) : firstSyncAt;
  if (!Number.isFinite(first.getTime())) return 0;
  const ms = Date.now() - first.getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

export function getOverallTier(days: number): CalibrationTier {
  if (days >= CALIBRATION_TOTAL_DAYS) return "calibrated";
  if (days >= 7) return "calibrating";
  return "warming";
}

/** Per-score readiness — Study Capacity is never gated. */
export function getScoreCalibration(
  scoreKey: "cognitive" | "study" | "burnout" | "retention" | "peak" | "peakSecondary",
  days: number,
): ScoreCalibration {
  // Study capacity is purely today-based — no baseline needed.
  if (scoreKey === "study") {
    return {
      tier: "calibrated",
      label: "",
      explanation: "Calculated from today's signals only — no calibration needed.",
    };
  }

  const overall = getOverallTier(days);
  const daysClamped = Math.min(days, CALIBRATION_TOTAL_DAYS);

  if (overall === "calibrated") {
    return {
      tier: "calibrated",
      label: "",
      explanation: "Personal baselines fully calibrated.",
    };
  }

  // Peak window: usable from day 1, just lower confidence.
  if (scoreKey === "peak" || scoreKey === "peakSecondary") {
    return {
      tier: overall,
      label: `Calibrating · ${daysClamped}/${CALIBRATION_TOTAL_DAYS} days`,
      explanation:
        overall === "warming"
          ? "Window shown from chronotype only. Confidence sharpens after 7+ days of sleep history."
          : "Window confidence rises as your sleep-timing pattern stabilises over 30 days.",
    };
  }

  // Cognitive / Burnout / Retention all need baselines or trend slopes.
  const baseLabel = `Calibrating · ${daysClamped}/${CALIBRATION_TOTAL_DAYS} days`;
  const explanations: Record<string, { warming: string; calibrating: string }> = {
    cognitive: {
      warming:
        "Using population norms for resting HR while Athena learns your personal baseline (30 days).",
      calibrating:
        "Personal HR baseline forming. Score sharpens as more days are logged.",
    },
    burnout: {
      warming:
        "Trend slopes need 7+ days of data — risk shown is provisional until then.",
      calibrating:
        "7-day trends are active. Respiratory-rate delta finalises at day 30.",
    },
    retention: {
      warming:
        "Sleep-timing regularity needs 7+ days to compute — using a neutral assumption for now.",
      calibrating:
        "Timing regularity active. Full personalisation at day 30.",
    },
  };

  const exp = explanations[scoreKey];
  return {
    tier: overall,
    label: baseLabel,
    explanation: overall === "warming" ? exp.warming : exp.calibrating,
  };
}
