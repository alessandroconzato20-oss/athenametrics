// src/algorithms/apexScores.ts
// All inputs sourced from Apple HealthKit only
// v2.0.0 — HRV unavailable mode (Capacitor plugin lacks HKQuantityTypeIdentifierHeartRateVariabilitySDNN)

export interface AppleHealthData {
  hrv_today: number;
  hrv_baseline_30d: number;
  resting_hr_today: number;
  resting_hr_baseline_30d: number;
  sleep_duration_hours: number;
  sleep_rem_percent: number;
  sleep_deep_percent: number;
  sleep_efficiency: number;
  sleep_end_time_minutes: number;
  sleep_timing_variance_7d: number;
  spo2_percent: number;
  active_energy_kcal: number;
  exercise_minutes: number;
  vo2_max: number;
  respiratory_rate_bpm: number;
  respiratory_rate_baseline_30d: number;
  hrv_7d: number[];
  resting_hr_7d: number[];
  sleep_quality_7d: number[];
  /** True when hrv_today/baseline are derived from RHR because no real HRV samples are available. */
  hrv_is_estimated?: boolean;

  // ── Behavioural burnout signals (all optional; missing data → signal skipped) ──
  /** Daily study hours over the last 14 days, oldest first. Index alignment with `study_hours_14d_is_weekend` if provided. */
  study_hours_14d?: number[];
  /** Per-day weekend flag (Sat/Sun) matching `study_hours_14d`. */
  study_hours_14d_is_weekend?: boolean[];
  /** 60-day personal average of daily study hours (excluding today). */
  study_hours_60d_avg?: number;
  /** Fraction in [0,1] of rest days in the last 7d where sleep quality > 60 AND next-day Q1 ≥ 4. */
  recovery_day_quality_7d?: number;
  /** Total rest days (<1h study) observed in the last 7d. RDQ is only used when ≥ 2. */
  recovery_day_rest_count_7d?: number;
  /** Fraction in [0,1] of study sessions ended < 50% of planned duration over last 14d. */
  session_abandonment_rate_14d?: number;
  /** Trend of abandonment rate week-on-week (positive = worsening). */
  session_abandonment_trend_14d?: number;
  /** Sleep-midpoint times in minutes-since-midnight for last 7 nights. Used for Sleep Regularity Index. */
  sleep_midpoints_7d?: number[];
  /** Today's resting wrist skin temperature in °C (Apple Watch Series 8+ / Oura / Garmin). */
  wrist_temp_today?: number;
  /** 30-day personal baseline of resting wrist temperature. */
  wrist_temp_baseline_30d?: number;
  /** Count of consecutive recent days with wrist temp > baseline + 0.4°C. */
  wrist_temp_elevated_days?: number;
}

// Toggle when the HealthKit plugin gains HRV SDNN support.
// When false, weights redistribute to non-HRV signals (no fabricated HRV proxy).
export const HRV_AVAILABLE = false;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalize(val: number, min: number, max: number): number {
  return clamp((val - min) / (max - min), 0, 1);
}

function trendSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const m = Math.round(mins % 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

// Inverted-U sleep duration curve: peak at 7.5–8.5h, <3h = 0
function sleepDurationScore(hours: number): number {
  if (hours <= 3) return 0;
  if (hours >= 7.5 && hours <= 8.5) return 100;
  if (hours < 7.5) {
    // 3h → 0, 7.5h → 100
    return clamp(((hours - 3) / (7.5 - 3)) * 100, 0, 100);
  }
  // >8.5h: gradual decline; 11h → 0
  return clamp(100 - ((hours - 8.5) / (11 - 8.5)) * 100, 0, 100);
}

// ─────────────────────────────────────────────
// 1. COGNITIVE READINESS  (0–100)
// ─────────────────────────────────────────────

export function getCognitiveReadiness(d: AppleHealthData): number {
  // Sleep quality with new ceilings: REM 22%, SWS (deep) 20%
  const sleepQuality =
    clamp(d.sleep_rem_percent / 22, 0, 1) * 0.6 +
    clamp(d.sleep_deep_percent / 20, 0, 1) * 0.4;
  const sleep_quality_score = clamp(sleepQuality * 100, 0, 100);

  const durationScore = sleepDurationScore(d.sleep_duration_hours);

  const hrDelta = d.resting_hr_today - d.resting_hr_baseline_30d;
  const rhr_score = clamp(100 - (hrDelta * 3), 0, 100);

  const spo2_score = d.spo2_percent >= 97
    ? 100
    : normalize(d.spo2_percent, 90, 97) * 100;

  if (HRV_AVAILABLE) {
    const hrvRatio = d.hrv_today / d.hrv_baseline_30d;
    const hrv_score = normalize(hrvRatio, 0.5, 1.4) * 100;
    const score =
      hrv_score * 0.35 +
      sleep_quality_score * 0.25 +
      durationScore * 0.20 +
      rhr_score * 0.15 +
      spo2_score * 0.05;
    return Math.round(clamp(score, 0, 100));
  }

  // HRV unavailable — redistributed weights
  // Sleep Quality 0.40, Sleep Duration 0.35, RHR 0.15, SpO2 0.10
  const score =
    sleep_quality_score * 0.40 +
    durationScore * 0.35 +
    rhr_score * 0.15 +
    spo2_score * 0.10;

  return Math.round(clamp(score, 0, 100));
}

// ─────────────────────────────────────────────
// 2. STUDY CAPACITY  (hours & minutes)
// ─────────────────────────────────────────────

export interface StudyCapacity {
  hours: number;
  minutes: number;
  totalMinutes: number;
  label: string;
}

export function getStudyCapacity(
  d: AppleHealthData,
  cognitiveReadiness: number
): StudyCapacity {
  const MAX_HOURS = 8;

  const cr_factor = cognitiveReadiness / 100;

  const sleepDelta = clamp(d.sleep_duration_hours - 8, -4, 0.5);
  const sleep_factor = 1 + (sleepDelta * 0.12);

  let activity_factor = 1.0;
  if (d.active_energy_kcal < 150) activity_factor = 0.92;
  else if (d.active_energy_kcal <= 600) activity_factor = 1.05;
  else if (d.active_energy_kcal <= 900) activity_factor = 1.0;
  else activity_factor = 0.88;

  const vo2_factor = normalize(d.vo2_max, 25, 60) * 0.15 + 0.925;

  const rawHours =
    MAX_HOURS * cr_factor * sleep_factor * activity_factor * vo2_factor;

  const totalMinutes = Math.round(clamp(rawHours, 0, MAX_HOURS) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    hours,
    minutes,
    totalMinutes,
    label: minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`,
  };
}

// ─────────────────────────────────────────────
// 3. BURNOUT RISK  (0–100, 7-day rolling)
// ─────────────────────────────────────────────

export function getBurnoutRisk(d: AppleHealthData): number {
  const hr_slope = trendSlope(d.resting_hr_7d);
  const hr_trend_score = clamp(50 + (hr_slope * 12), 0, 100);

  const sleep_slope = trendSlope(d.sleep_quality_7d);
  const sleep_trend_score = clamp(50 - (sleep_slope * 5), 0, 100);

  const resp_delta = d.respiratory_rate_bpm - d.respiratory_rate_baseline_30d;
  const resp_score = clamp(50 + (resp_delta * 12), 0, 100);

  if (HRV_AVAILABLE) {
    const hrv_slope = trendSlope(d.hrv_7d);
    const hrv_baseline_avg = d.hrv_7d.reduce((a, b) => a + b, 0) / d.hrv_7d.length;
    const hrv_trend_score = clamp(50 - (hrv_slope / hrv_baseline_avg) * 300, 0, 100);

    const risk =
      hrv_trend_score * 0.35 +
      hr_trend_score * 0.25 +
      sleep_trend_score * 0.25 +
      resp_score * 0.15;
    return Math.round(clamp(risk, 0, 100));
  }

  // HRV unavailable — redistributed weights
  const risk =
    hr_trend_score * 0.60 +
    sleep_trend_score * 0.30 +
    resp_score * 0.10;

  return Math.round(clamp(risk, 0, 100));
}

// ─────────────────────────────────────────────
// 4. RETENTION OUTLOOK  (0–100%)
// ─────────────────────────────────────────────

export function getRetentionOutlook(
  d: AppleHealthData,
  cognitiveReadiness: number
): number {
  const rem_score =
    d.sleep_rem_percent >= 20
      ? 100
      : normalize(d.sleep_rem_percent, 10, 20) * 100;

  const timing_score = normalize(60 - d.sleep_timing_variance_7d, 0, 60) * 100;

  const deep_score =
    d.sleep_deep_percent >= 18
      ? 100
      : normalize(d.sleep_deep_percent, 8, 18) * 100;

  if (HRV_AVAILABLE) {
    const hrvRatio = d.hrv_today / d.hrv_baseline_30d;
    const hrv_score = normalize(hrvRatio, 0.55, 1.35) * 100;
    const outlook =
      rem_score * 0.30 +
      hrv_score * 0.25 +
      timing_score * 0.30 +
      deep_score * 0.15;
    return Math.round(clamp(outlook, 0, 100));
  }

  // HRV unavailable — redistribute the 0.25 HRV weight to REM/timing/deep
  const outlook =
    rem_score * 0.50 +
    timing_score * 0.30 +
    deep_score * 0.20;

  return Math.round(clamp(outlook, 0, 100));
}

// ─────────────────────────────────────────────
// 5. PEAK STUDY WINDOW  (start & end time)
// ─────────────────────────────────────────────

export type Chronotype = "early_bird" | "intermediate" | "night_owl";

export interface PeakWindow {
  primary_start: string;
  primary_end: string;
  secondary_start: string;
  secondary_end: string;
  chronotype: Chronotype;
  confidence: "high" | "medium" | "low";
}

export function getPeakStudyWindow(d: AppleHealthData): PeakWindow {
  const wakeTime = d.sleep_end_time_minutes;

  // Updated chronotype boundaries: Early < 6:00 (360), Night Owl > 8:30 (510)
  const chronotype: Chronotype =
    wakeTime < 360
      ? "early_bird"
      : wakeTime > 510
      ? "night_owl"
      : "intermediate";

  const peakOffsets = {
    early_bird: { p1_start: 90, p1_dur: 150, p2_start: 420, p2_dur: 120 },
    intermediate: { p1_start: 120, p1_dur: 150, p2_start: 480, p2_dur: 150 },
    night_owl: { p1_start: 150, p1_dur: 150, p2_start: 510, p2_dur: 150 },
  };

  const offsets = peakOffsets[chronotype];

  // No HRV-based shift when HRV unavailable
  let hvr_shift = 0;
  if (HRV_AVAILABLE) {
    const hrvRatio = d.hrv_today / d.hrv_baseline_30d;
    hvr_shift = hrvRatio >= 0.9 ? 0 : Math.round((0.9 - hrvRatio) * 120);
  }

  const p1_start = wakeTime + offsets.p1_start + hvr_shift;
  const p1_end = p1_start + offsets.p1_dur;
  const p2_start = wakeTime + offsets.p2_start + Math.round(hvr_shift * 0.5);
  const p2_end = p2_start + offsets.p2_dur;

  const confidence: "high" | "medium" | "low" =
    d.sleep_timing_variance_7d < 15 ? "high"
    : d.sleep_timing_variance_7d < 40 ? "medium"
    : "low";

  return {
    primary_start: minutesToTime(p1_start),
    primary_end: minutesToTime(p1_end),
    secondary_start: minutesToTime(p2_start),
    secondary_end: minutesToTime(p2_end),
    chronotype,
    confidence,
  };
}

// ─────────────────────────────────────────────
// MASTER FUNCTION
// ─────────────────────────────────────────────

export interface ApexScores {
  cognitiveReadiness: number;
  studyCapacity: StudyCapacity;
  burnoutRisk: number;
  retentionOutlook: number;
  peakStudyWindow: PeakWindow;
}

export function calculateApexScores(data: AppleHealthData): ApexScores {
  const cognitiveReadiness = getCognitiveReadiness(data);
  return {
    cognitiveReadiness,
    studyCapacity: getStudyCapacity(data, cognitiveReadiness),
    burnoutRisk: getBurnoutRisk(data),
    retentionOutlook: getRetentionOutlook(data, cognitiveReadiness),
    peakStudyWindow: getPeakStudyWindow(data),
  };
}
