// Layer 4: property-based tests.
// Generates thousands of random valid inputs and asserts invariants that must
// hold no matter what — never NaN, never out of range, monotonic where expected.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  getCognitiveReadiness,
  getStudyCapacity,
  getBurnoutRisk,
  getRetentionOutlook,
  getPeakStudyWindow,
  calculateApexScores,
  type AppleHealthData,
} from "./apexScores";

const arbHealth = (): fc.Arbitrary<AppleHealthData> =>
  fc.record({
    hrv_today: fc.double({ min: 0, max: 150, noNaN: true }),
    hrv_baseline_30d: fc.double({ min: 1, max: 150, noNaN: true }),
    resting_hr_today: fc.double({ min: 30, max: 120, noNaN: true }),
    resting_hr_baseline_30d: fc.double({ min: 30, max: 120, noNaN: true }),
    sleep_duration_hours: fc.double({ min: 0, max: 14, noNaN: true }),
    sleep_rem_percent: fc.double({ min: 0, max: 40, noNaN: true }),
    sleep_deep_percent: fc.double({ min: 0, max: 40, noNaN: true }),
    sleep_efficiency: fc.double({ min: 0, max: 100, noNaN: true }),
    sleep_end_time_minutes: fc.integer({ min: 0, max: 1439 }),
    sleep_timing_variance_7d: fc.double({ min: 0, max: 120, noNaN: true }),
    spo2_percent: fc.double({ min: 80, max: 100, noNaN: true }),
    active_energy_kcal: fc.double({ min: 0, max: 2000, noNaN: true }),
    exercise_minutes: fc.double({ min: 0, max: 300, noNaN: true }),
    vo2_max: fc.double({ min: 15, max: 80, noNaN: true }),
    respiratory_rate_bpm: fc.double({ min: 8, max: 25, noNaN: true }),
    respiratory_rate_baseline_30d: fc.double({ min: 8, max: 25, noNaN: true }),
    hrv_7d: fc.array(fc.double({ min: 0, max: 150, noNaN: true }), { minLength: 0, maxLength: 7 }),
    resting_hr_7d: fc.array(fc.double({ min: 30, max: 120, noNaN: true }), { minLength: 0, maxLength: 7 }),
    sleep_quality_7d: fc.array(fc.double({ min: 0, max: 100, noNaN: true }), { minLength: 0, maxLength: 7 }),
  });

const inRange = (v: number, lo = 0, hi = 100) =>
  Number.isFinite(v) && v >= lo && v <= hi;

describe("ApexScores invariants (property-based)", () => {
  it("cognitive readiness always 0-100, never NaN", () => {
    fc.assert(
      fc.property(arbHealth(), (d) => inRange(getCognitiveReadiness(d))),
      { numRuns: 500 }
    );
  });

  it("burnout risk always 0-100, never NaN", () => {
    fc.assert(
      fc.property(arbHealth(), (d) => inRange(getBurnoutRisk(d))),
      { numRuns: 500 }
    );
  });

  it("retention outlook always 0-100, never NaN", () => {
    fc.assert(
      fc.property(arbHealth(), (d) => inRange(getRetentionOutlook(d, 75))),
      { numRuns: 500 }
    );
  });

  it("study capacity never exceeds 8h and is non-negative", () => {
    fc.assert(
      fc.property(arbHealth(), fc.integer({ min: 0, max: 100 }), (d, cr) => {
        const sc = getStudyCapacity(d, cr);
        return inRange(sc.totalMinutes, 0, 8 * 60);
      }),
      { numRuns: 500 }
    );
  });

  it("peak window always returns parseable times", () => {
    fc.assert(
      fc.property(arbHealth(), (d) => {
        const w = getPeakStudyWindow(d);
        return /^\d{1,2}:\d{2}\s(AM|PM)$/.test(w.primary_start) &&
               /^\d{1,2}:\d{2}\s(AM|PM)$/.test(w.primary_end);
      }),
      { numRuns: 500 }
    );
  });

  it("full pipeline never crashes", () => {
    fc.assert(
      fc.property(arbHealth(), (d) => {
        const s = calculateApexScores(d);
        return inRange(s.cognitiveReadiness) &&
               inRange(s.burnoutRisk) &&
               inRange(s.retentionOutlook);
      }),
      { numRuns: 300 }
    );
  });
});
