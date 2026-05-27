import { describe, it, expect } from "vitest";
import { applyCheckinModifiers, type CheckinData } from "./checkinModifiers";
import { calculateApexScores } from "./apexScores";
import { PERSONAS } from "@/test/fixtures/personas";

const baseHealth = PERSONAS.find((p) => p.id === "consistent-grinder")!.health;

describe("applyCheckinModifiers", () => {
  it("returns unchanged scores when checkin is null", () => {
    const base = calculateApexScores(baseHealth);
    const out = applyCheckinModifiers(base, null);
    expect(out.cognitiveReadiness).toBe(base.cognitiveReadiness);
  });

  it("applies floor of 10 to all metrics", () => {
    const base = calculateApexScores(baseHealth);
    const checkin: CheckinData = {
      rest_level: 1,
      stress_level: 4,
      motivation_level: 1,
      night_factors: ["alcohol", "unwell", "stress"],
      study_plan_window: "within_30",
    };
    const out = applyCheckinModifiers(base, checkin);
    expect(out.cognitiveReadiness).toBeGreaterThanOrEqual(10);
    expect(out.retentionOutlook).toBeGreaterThanOrEqual(10);
    expect(out.studyCapacity.totalMinutes).toBeGreaterThanOrEqual(Math.round(0.1 * 8 * 60));
  });

  it("Rest override sets peak window to 'Rest' on illness", () => {
    const base = calculateApexScores(baseHealth);
    const out = applyCheckinModifiers(base, {
      rest_level: 1,
      stress_level: 3,
      motivation_level: 2,
      night_factors: ["unwell"],
      study_plan_window: "not_today",
    });
    expect(out.peakStudyWindow.primary_start).toBe("Rest");
  });

  it("positive check-in does not exceed 100 cap on metrics", () => {
    const base = calculateApexScores(baseHealth);
    const out = applyCheckinModifiers(base, {
      rest_level: 5,
      stress_level: 1,
      motivation_level: 5,
      night_factors: [],
      study_plan_window: "1_2h",
    });
    expect(out.cognitiveReadiness).toBeLessThanOrEqual(100);
    expect(out.retentionOutlook).toBeLessThanOrEqual(100);
  });

  it("never produces NaN even with extreme inputs", () => {
    const base = calculateApexScores(baseHealth);
    const out = applyCheckinModifiers(base, {
      rest_level: 1,
      stress_level: 4,
      motivation_level: 1,
      night_factors: ["alcohol", "caffeine", "screen", "stress", "unwell"],
      study_plan_window: "within_30",
      did_exercise: true,
      exercise_type: "cardio",
      exercise_duration_minutes: 200,
    });
    expect(Number.isFinite(out.cognitiveReadiness)).toBe(true);
    expect(Number.isFinite(out.burnoutRisk)).toBe(true);
  });
});
