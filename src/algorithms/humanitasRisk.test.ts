import { describe, it, expect } from "vitest";
import { computeStudentRisk, type StudentInput } from "./humanitasRisk";

function baseStudent(overrides: Partial<StudentInput> = {}): StudentInput {
  return {
    userId: "u1",
    studentName: "Test Student",
    matricola: "12345",
    year: 2,
    assessments: [],
    studyLogs: [],
    wellbeingCheckins: [],
    surveys: [],
    passedExamNames: new Set(),
    avgHrv14d: null,
    hrvBaseline: null,
    avgSleepHours14d: null,
    selfConfidence: {},
    cohortAvgMinutes: 0,
    ...overrides,
  };
}

describe("computeStudentRisk", () => {
  it("year-1 student with no exams has low risk", () => {
    const r = computeStudentRisk(baseStudent({ year: 1 }));
    expect(r.riskLevel).toBe("low");
  });

  it("year-2 student with unpassed blocking exams → critical", () => {
    const r = computeStudentRisk(baseStudent({ year: 2 }));
    expect(r.riskLevel).toBe("critical");
    expect(r.riskScore).toBeGreaterThanOrEqual(0.76);
  });

  it("year-2 student who passed all blockers → low", () => {
    const passed = new Set([
      "Building Bodies",
      "Principles of Living Matter",
      "The Cell: Molecules and Processes",
      "The Cell: Functions and Control",
      "Body Architecture",
      "Body At Work 1",
      "Body At Work 2",
    ]);
    const r = computeStudentRisk(baseStudent({ year: 2, passedExamNames: passed }));
    expect(r.riskLevel).toBe("low");
  });

  it("risk score always 0-1", () => {
    const r = computeStudentRisk(baseStudent({ year: 3 }));
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
    expect(r.riskScore).toBeLessThanOrEqual(1);
  });

  it("sleep deprivation triggers a factor", () => {
    const passed = new Set([
      "Building Bodies",
      "Principles of Living Matter",
      "The Cell: Molecules and Processes",
      "The Cell: Functions and Control",
      "Body Architecture",
      "Body At Work 1",
      "Body At Work 2",
    ]);
    const r = computeStudentRisk(
      baseStudent({ year: 2, passedExamNames: passed, avgSleepHours14d: 4 })
    );
    expect(r.factors.some((f) => f.signal === "Sleep deprivation")).toBe(true);
  });
});
