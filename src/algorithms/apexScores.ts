// src/algorithms/apexScores.ts
// All inputs sourced from Apple HealthKit only

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
}

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

// ─────────────────────────────────────────────
// 1. COGNITIVE READINESS  (0–100)
// ─────────────────────────────────────────────

export function getCognitiveReadiness(d: AppleHealthData): number {
  const hrvRatio = d.hrv_today / d.hrv_baseline_30d;
  const hrv_score = normalize(hrvRatio, 0.5, 1.4) * 100;

  const sleepQuality = (d.sleep_rem_percent / 20) * 0.6 + (d.sleep_deep_percent / 18) * 0.4;
  const sleep_quality_score = clamp(sleepQuality * 100, 0, 100);

  const durationScore =
    d.sleep_duration_hours >= 6 && d.sleep_duration_hours <= 9.5
      ? normalize(d.sleep_duration_hours, 5, 8.5) * 100
      : d.sleep_duration_hours < 6
      ? normalize(d.sleep_duration_hours, 3, 6) * 60
      : normalize(9.5 - (d.sleep_duration_hours - 9.5), 0, 9.5) * 90;

  const hrDelta = d.resting_hr_today - d.resting_hr_baseline_30d;
  const rhr_score = clamp(100 - (hrDelta * 5), 0, 100);

  const spo2_score = d.spo2_percent >= 97
    ? 100
    : normalize(d.spo2_percent, 90, 97) * 100;

  const score =
    hrv_score * 0.35 +
    sleep_quality_score * 0.25 +
    durationScore * 0.20 +
    rhr_score * 0.15 +
    spo2_score * 0.05;

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
  const MAX_HOURS = 9;

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
  const hrv_slope = trendSlope(d.hrv_7d);
  const hrv_baseline_avg = d.hrv_7d.reduce((a, b) => a + b, 0) / d.hrv_7d.length;
  const hrv_trend_score = clamp(50 - (hrv_slope / hrv_baseline_avg) * 500, 0, 100);

  const hr_slope = trendSlope(d.resting_hr_7d);
  const hr_trend_score = clamp(50 + (hr_slope * 20), 0, 100);

  const sleep_slope = trendSlope(d.sleep_quality_7d);
  const sleep_trend_score = clamp(50 - (sleep_slope * 3), 0, 100);

  const resp_delta = d.respiratory_rate_bpm - d.respiratory_rate_baseline_30d;
  const resp_score = clamp(50 + (resp_delta * 12), 0, 100);

  const risk =
    hrv_trend_score * 0.35 +
    hr_trend_score * 0.25 +
    sleep_trend_score * 0.25 +
    resp_score * 0.15;

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

  const hrvRatio = d.hrv_today / d.hrv_baseline_30d;
  const hrv_score = normalize(hrvRatio, 0.55, 1.35) * 100;

  const timing_score = normalize(60 - d.sleep_timing_variance_7d, 0, 60) * 100;

  const deep_score =
    d.sleep_deep_percent >= 18
      ? 100
      : normalize(d.sleep_deep_percent, 8, 18) * 100;

  const outlook =
    rem_score * 0.40 +
    hrv_score * 0.25 +
    timing_score * 0.20 +
    deep_score * 0.15;

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

  const chronotype: Chronotype =
    wakeTime < 390
      ? "early_bird"
      : wakeTime > 480
      ? "night_owl"
      : "intermediate";

  const peakOffsets = {
    early_bird: { p1_start: 90, p1_dur: 150, p2_start: 420, p2_dur: 120 },
    intermediate: { p1_start: 120, p1_dur: 150, p2_start: 480, p2_dur: 150 },
    night_owl: { p1_start: 150, p1_dur: 150, p2_start: 510, p2_dur: 150 },
  };

  const offsets = peakOffsets[chronotype];

  const hrvRatio = d.hrv_today / d.hrv_baseline_30d;
  const hvr_shift = hrvRatio >= 0.9 ? 0 : Math.round((0.9 - hrvRatio) * 120);

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
