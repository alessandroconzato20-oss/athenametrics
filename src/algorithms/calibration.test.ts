import { describe, it, expect } from "vitest";
import {
  getCalibrationDays,
  getOverallTier,
  getScoreCalibration,
  CALIBRATION_TOTAL_DAYS,
} from "./calibration";

describe("getCalibrationDays", () => {
  it("returns 0 for null/invalid input", () => {
    expect(getCalibrationDays(null)).toBe(0);
    expect(getCalibrationDays(undefined)).toBe(0);
    expect(getCalibrationDays("not-a-date")).toBe(0);
  });
  it("returns at least 1 on sync day", () => {
    expect(getCalibrationDays(new Date())).toBeGreaterThanOrEqual(1);
  });
  it("increases over time", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000);
    expect(getCalibrationDays(tenDaysAgo)).toBeGreaterThanOrEqual(10);
  });
});

describe("getOverallTier", () => {
  it("warming for <7 days", () => {
    expect(getOverallTier(3)).toBe("warming");
  });
  it("calibrating for 7-29 days", () => {
    expect(getOverallTier(15)).toBe("calibrating");
  });
  it("calibrated at 30+ days", () => {
    expect(getOverallTier(CALIBRATION_TOTAL_DAYS)).toBe("calibrated");
  });
});

describe("getScoreCalibration", () => {
  it("study capacity never gated", () => {
    expect(getScoreCalibration("study", 0).tier).toBe("calibrated");
  });
  it("cognitive shows calibrating label when in progress", () => {
    const r = getScoreCalibration("cognitive", 10);
    expect(r.tier).toBe("calibrating");
    expect(r.label).toContain("10/30");
  });
});
