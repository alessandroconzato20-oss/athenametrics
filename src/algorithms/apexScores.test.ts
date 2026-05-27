import { describe, it, expect } from "vitest";
import {
  getCognitiveReadiness,
  getStudyCapacity,
  getBurnoutRisk,
  getRetentionOutlook,
  getPeakStudyWindow,
  calculateApexScores,
  type AppleHealthData,
} from "./apexScores";
import { PERSONAS } from "@/test/fixtures/personas";

const neutral = (): AppleHealthData => ({
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

describe("getCognitiveReadiness", () => {
  it("returns high score for ideal inputs", () => {
    expect(getCognitiveReadiness(neutral())).toBeGreaterThanOrEqual(85);
  });
  it("drops sharply with poor sleep", () => {
    const d = neutral();
    d.sleep_duration_hours = 3;
    d.sleep_rem_percent = 8;
    d.sleep_deep_percent = 5;
    expect(getCognitiveReadiness(d)).toBeLessThan(40);
  });
  it("stays within 0-100", () => {
    for (const p of PERSONAS) {
      const v = getCognitiveReadiness(p.health);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
  it("does not return NaN for zero/missing biometrics", () => {
    const empty = PERSONAS.find((p) => p.id === "new-user-no-healthkit")!;
    expect(Number.isFinite(getCognitiveReadiness(empty.health))).toBe(true);
  });
});

describe("getStudyCapacity", () => {
  it("never exceeds 8 hours", () => {
    for (const p of PERSONAS) {
      const sc = getStudyCapacity(p.health, 100);
      expect(sc.totalMinutes).toBeLessThanOrEqual(8 * 60);
    }
  });
  it("returns 0 when cognitive readiness is 0", () => {
    const sc = getStudyCapacity(neutral(), 0);
    expect(sc.totalMinutes).toBe(0);
  });
  it("scales with cognitive readiness", () => {
    const low = getStudyCapacity(neutral(), 30).totalMinutes;
    const high = getStudyCapacity(neutral(), 90).totalMinutes;
    expect(high).toBeGreaterThan(low);
  });
});

describe("getBurnoutRisk", () => {
  it("low for stable healthy trends", () => {
    expect(getBurnoutRisk(neutral())).toBeLessThan(60);
  });
  it("rises with worsening RHR trend", () => {
    const d = neutral();
    d.resting_hr_7d = [60, 62, 64, 66, 68, 70, 72];
    expect(getBurnoutRisk(d)).toBeGreaterThan(60);
  });
  it("stays within 0-100", () => {
    for (const p of PERSONAS) {
      const v = getBurnoutRisk(p.health);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("getRetentionOutlook", () => {
  it("high with good REM + consistent timing", () => {
    expect(getRetentionOutlook(neutral(), 90)).toBeGreaterThan(70);
  });
  it("drops with low REM", () => {
    const d = neutral();
    d.sleep_rem_percent = 8;
    expect(getRetentionOutlook(d, 90)).toBeLessThan(80);
  });
});

describe("getPeakStudyWindow", () => {
  it("classifies early bird vs night owl from wake time", () => {
    const early = neutral();
    early.sleep_end_time_minutes = 5 * 60;
    const owl = neutral();
    owl.sleep_end_time_minutes = 11 * 60;
    expect(getPeakStudyWindow(early).chronotype).toBe("early_bird");
    expect(getPeakStudyWindow(owl).chronotype).toBe("night_owl");
  });
  it("confidence reflects timing variance", () => {
    const stable = neutral();
    stable.sleep_timing_variance_7d = 5;
    const chaotic = neutral();
    chaotic.sleep_timing_variance_7d = 60;
    expect(getPeakStudyWindow(stable).confidence).toBe("high");
    expect(getPeakStudyWindow(chaotic).confidence).toBe("low");
  });
});

describe("calculateApexScores", () => {
  it("returns all 5 metrics with valid shapes for every persona", () => {
    for (const p of PERSONAS) {
      const s = calculateApexScores(p.health);
      expect(s.cognitiveReadiness).toBeGreaterThanOrEqual(0);
      expect(s.studyCapacity.totalMinutes).toBeGreaterThanOrEqual(0);
      expect(s.burnoutRisk).toBeGreaterThanOrEqual(0);
      expect(s.retentionOutlook).toBeGreaterThanOrEqual(0);
      expect(s.peakStudyWindow.primary_start).toMatch(/^\d{1,2}:\d{2}\s(AM|PM)$/);
    }
  });
});
