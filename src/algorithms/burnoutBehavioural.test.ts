import { describe, it, expect } from "vitest";
import {
  getBurnoutBreakdown,
  getBurnoutRisk,
  getBehaviouralBurnoutRiskPoints,
  type AppleHealthData,
} from "./apexScores";
import { applyCheckinModifiers } from "./checkinModifiers";
import { calculateApexScores } from "./apexScores";
import { PERSONAS } from "@/test/fixtures/personas";

const neutralHealth = (): AppleHealthData => ({
  hrv_today: 55,
  hrv_baseline_30d: 55,
  resting_hr_today: 62,
  resting_hr_baseline_30d: 62,
  sleep_duration_hours: 8,
  sleep_rem_percent: 22,
  sleep_deep_percent: 20,
  sleep_efficiency: 92,
  sleep_end_time_minutes: 7 * 60 + 15,
  sleep_timing_variance_7d: 18,
  spo2_percent: 97,
  active_energy_kcal: 450,
  exercise_minutes: 30,
  vo2_max: 42,
  respiratory_rate_bpm: 14,
  respiratory_rate_baseline_30d: 14,
  hrv_7d: [55, 55, 55, 55, 55, 55, 55],
  resting_hr_7d: [62, 62, 62, 62, 62, 62, 62],
  sleep_quality_7d: [80, 80, 80, 80, 80, 80, 80],
});

describe("Burnout behavioural signals", () => {
  it("returns 0 additive points when no behavioural data present", () => {
    expect(getBehaviouralBurnoutRiskPoints(neutralHealth())).toBe(0);
  });

  it("flags high CV of study hours (volatility)", () => {
    const d = neutralHealth();
    d.study_hours_14d = [0.5, 9, 1, 8, 0.5, 9, 1, 8, 0.5, 9, 1, 8, 0.5, 9];
    const b = getBurnoutBreakdown(d);
    expect(b.loadVolatility).toBeGreaterThanOrEqual(5);
  });

  it("flags cumulative overreach (CWI > 1.6)", () => {
    const d = neutralHealth();
    d.study_hours_14d = Array(14).fill(8); // 112h total
    d.study_hours_60d_avg = 4;             // expected 56h → CWI = 2.0
    const b = getBurnoutBreakdown(d);
    expect(b.cumulativeOverreach).toBe(12);
  });

  it("flags low recovery day quality", () => {
    const d = neutralHealth();
    d.recovery_day_quality_7d = 0.1;
    d.recovery_day_rest_count_7d = 2;
    expect(getBurnoutBreakdown(d).recoveryDayQuality).toBe(8);
  });

  it("ignores RDQ when fewer than 2 rest days", () => {
    const d = neutralHealth();
    d.recovery_day_quality_7d = 0;
    d.recovery_day_rest_count_7d = 1;
    expect(getBurnoutBreakdown(d).recoveryDayQuality).toBe(0);
  });

  it("flags high session abandonment with rising trend", () => {
    const d = neutralHealth();
    d.session_abandonment_rate_14d = 0.45;
    d.session_abandonment_trend_14d = 0.12;
    expect(getBurnoutBreakdown(d).sessionAbandonment).toBe(8);
  });

  it("flags irregular sleep midpoints (low SRI)", () => {
    const d = neutralHealth();
    // Wildly inconsistent midpoints → SD ≈ 90 → SRI ≈ -80 < 55
    d.sleep_midpoints_7d = [180, 360, 200, 420, 150, 390, 210];
    expect(getBurnoutBreakdown(d).sleepRegularity).toBe(9);
  });

  it("flags weekend non-detachment (ratio > 0.85)", () => {
    const d = neutralHealth();
    d.study_hours_14d = Array(14).fill(5);
    d.study_hours_14d_is_weekend = [
      false, false, false, false, false, true, true,
      false, false, false, false, false, true, true,
    ];
    expect(getBurnoutBreakdown(d).weekendAsymmetry).toBe(4);
  });

  it("flags sustained wrist temperature elevation", () => {
    const d = neutralHealth();
    d.wrist_temp_elevated_days = 4;
    expect(getBurnoutBreakdown(d).wristTempElevation).toBe(6);
  });

  it("getBurnoutRisk stays bounded [0,100] with all signals firing", () => {
    const d = neutralHealth();
    d.study_hours_14d = [0.2, 12, 0.2, 12, 0.2, 12, 0.2, 12, 0.2, 12, 0.2, 12, 0.2, 12];
    d.study_hours_60d_avg = 3;
    d.recovery_day_quality_7d = 0;
    d.recovery_day_rest_count_7d = 3;
    d.session_abandonment_rate_14d = 0.7;
    d.session_abandonment_trend_14d = 0.2;
    d.sleep_midpoints_7d = [120, 480, 100, 500, 80, 520, 60];
    d.wrist_temp_elevated_days = 5;
    const risk = getBurnoutRisk(d);
    expect(risk).toBeGreaterThan(40);
    expect(risk).toBeLessThanOrEqual(100);
  });

  it("emotional_exhaustion multiplier raises burnout (5 = ×1.30)", () => {
    const baseHealth = PERSONAS.find((p) => p.id === "consistent-grinder")!.health;
    const base = calculateApexScores(baseHealth);
    const high = applyCheckinModifiers(base, {
      rest_level: 3, stress_level: 2, motivation_level: 3,
      night_factors: ["normal"], study_plan_window: "1_2h",
      emotional_exhaustion: 5,
    });
    const low = applyCheckinModifiers(base, {
      rest_level: 3, stress_level: 2, motivation_level: 3,
      night_factors: ["normal"], study_plan_window: "1_2h",
      emotional_exhaustion: 1,
    });
    expect(high.burnoutRisk).toBeGreaterThan(low.burnoutRisk);
  });
});
