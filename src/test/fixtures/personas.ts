// Test personas for algorithm validation.
// Each persona is a complete AppleHealthData + optional CheckinData combo
// representing a recognizable student archetype.
//
// These fixtures are dev/test-only — never imported by app runtime code.

import type { AppleHealthData } from "@/algorithms/apexScores";
import type { CheckinData, HistoricalCheckin } from "@/algorithms/checkinModifiers";

export interface Persona {
  id: string;
  name: string;
  description: string;
  health: AppleHealthData;
  checkin?: CheckinData | null;
  history?: HistoricalCheckin[];
}

// Helper to build a "neutral" baseline we can override.
function baseline(overrides: Partial<AppleHealthData> = {}): AppleHealthData {
  return {
    hrv_today: 55,
    hrv_baseline_30d: 55,
    resting_hr_today: 62,
    resting_hr_baseline_30d: 62,
    sleep_duration_hours: 7.8,
    sleep_rem_percent: 21,
    sleep_deep_percent: 18,
    sleep_efficiency: 92,
    sleep_end_time_minutes: 7 * 60 + 15, // 7:15 AM
    sleep_timing_variance_7d: 18,
    spo2_percent: 97,
    active_energy_kcal: 450,
    exercise_minutes: 30,
    vo2_max: 42,
    respiratory_rate_bpm: 14,
    respiratory_rate_baseline_30d: 14,
    hrv_7d: [55, 56, 54, 55, 56, 55, 54],
    resting_hr_7d: [62, 61, 62, 62, 63, 62, 61],
    sleep_quality_7d: [80, 82, 79, 81, 80, 82, 80],
    hrv_is_estimated: false,
    ...overrides,
  };
}

export const PERSONAS: Persona[] = [
  {
    id: "well-rested-athlete",
    name: "Well-rested athlete",
    description: "8h sleep, high HRV, low RHR, active. Baseline of peak performance.",
    health: baseline({
      hrv_today: 78,
      hrv_baseline_30d: 72,
      resting_hr_today: 52,
      resting_hr_baseline_30d: 54,
      sleep_duration_hours: 8.0,
      sleep_rem_percent: 23,
      sleep_deep_percent: 21,
      sleep_efficiency: 95,
      vo2_max: 55,
      active_energy_kcal: 650,
      exercise_minutes: 60,
    }),
  },
  {
    id: "sleep-deprived-student",
    name: "Sleep-deprived student",
    description: "4h sleep, suppressed HRV, elevated HR. Acute cognitive deficit.",
    health: baseline({
      hrv_today: 32,
      hrv_baseline_30d: 50,
      resting_hr_today: 72,
      resting_hr_baseline_30d: 62,
      sleep_duration_hours: 4.0,
      sleep_rem_percent: 12,
      sleep_deep_percent: 9,
      sleep_efficiency: 78,
    }),
  },
  {
    id: "burnt-out-finalist",
    name: "Burnt-out finalist",
    description: "Chronically low sleep, declining 30-day HRV trend, rising RHR.",
    health: baseline({
      hrv_today: 38,
      hrv_baseline_30d: 55,
      resting_hr_today: 70,
      resting_hr_baseline_30d: 60,
      sleep_duration_hours: 5.5,
      sleep_rem_percent: 14,
      sleep_deep_percent: 11,
      sleep_efficiency: 82,
      hrv_7d: [50, 48, 45, 42, 40, 38, 36],
      resting_hr_7d: [62, 64, 66, 68, 69, 70, 71],
      sleep_quality_7d: [75, 72, 70, 66, 62, 58, 55],
      respiratory_rate_bpm: 17,
      respiratory_rate_baseline_30d: 14,
    }),
  },
  {
    id: "anxious-pre-exam",
    name: "Anxious before exam",
    description: "Normal sleep but high stress + low motivation via check-in.",
    health: baseline(),
    checkin: {
      rest_level: 3,
      stress_level: 4,
      motivation_level: 2,
      night_factors: ["stress"],
      study_plan_window: "within_30",
    },
  },
  {
    id: "recovery-day",
    name: "Recovery day (Rest override)",
    description: "Illness flagged in night factors → Rest override on peak window.",
    health: baseline(),
    checkin: {
      rest_level: 2,
      stress_level: 2,
      motivation_level: 3,
      night_factors: ["unwell"],
      study_plan_window: "not_today",
    },
  },
  {
    id: "night-owl-mid-semester",
    name: "Night owl mid-semester",
    description: "Late wake time, late chronotype, moderate stress.",
    health: baseline({
      sleep_end_time_minutes: 10 * 60 + 30, // 10:30 AM
      sleep_timing_variance_7d: 45,
    }),
  },
  {
    id: "new-user-no-healthkit",
    name: "New user, no HealthKit data",
    description: "Zeroed/missing biometrics. Tests graceful fallback.",
    health: baseline({
      hrv_today: 0,
      hrv_baseline_30d: 0,
      resting_hr_today: 0,
      resting_hr_baseline_30d: 0,
      sleep_duration_hours: 0,
      sleep_rem_percent: 0,
      sleep_deep_percent: 0,
      sleep_efficiency: 0,
      spo2_percent: 0,
      vo2_max: 0,
      hrv_7d: [],
      resting_hr_7d: [],
      sleep_quality_7d: [],
    }),
  },
  {
    id: "consistent-grinder",
    name: "Consistent grinder",
    description: "Flat baseline metrics, steady study habits, neutral check-in.",
    health: baseline(),
    checkin: {
      rest_level: 3,
      stress_level: 2,
      motivation_level: 4,
      night_factors: [],
      study_plan_window: "1_2h",
    },
  },
  {
    id: "comeback-student",
    name: "Comeback student",
    description: "Improving 7-day HRV trend after a bad month.",
    health: baseline({
      hrv_today: 58,
      hrv_baseline_30d: 50,
      hrv_7d: [45, 48, 50, 53, 55, 57, 58],
      resting_hr_7d: [68, 67, 65, 64, 63, 62, 61],
      sleep_quality_7d: [60, 65, 70, 73, 76, 78, 80],
    }),
  },
  {
    id: "caffeine-screen-night",
    name: "Late-night caffeine + screens",
    description: "Both night factors stacked — should shift peak window later.",
    health: baseline(),
    checkin: {
      rest_level: 2,
      stress_level: 3,
      motivation_level: 3,
      night_factors: ["caffeine", "screen"],
      study_plan_window: "3plus",
    },
  },
];

export function getPersona(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}
