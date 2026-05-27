// Layer 2: persona snapshot test.
// Runs every persona through the full pipeline and snapshots the outputs.
// When you tweak an algorithm, failures here show *which persona shifted*
// and by how much — much more readable than a wall of number diffs.

import { describe, it, expect } from "vitest";
import { calculateApexScores } from "@/algorithms/apexScores";
import { applyCheckinModifiers } from "@/algorithms/checkinModifiers";
import { PERSONAS } from "./personas";

describe("Persona pipeline snapshots", () => {
  for (const p of PERSONAS) {
    it(`${p.name}: produces stable outputs`, () => {
      const base = calculateApexScores(p.health);
      const final = applyCheckinModifiers(base, p.checkin ?? null, p.history);
      const summary = {
        cognitiveReadiness: final.cognitiveReadiness,
        burnoutRisk: final.burnoutRisk,
        retentionOutlook: final.retentionOutlook,
        studyCapacityMinutes: final.studyCapacity.totalMinutes,
        peakStart: final.peakStudyWindow.primary_start,
        peakEnd: final.peakStudyWindow.primary_end,
        chronotype: final.peakStudyWindow.chronotype,
        confidence: final.peakStudyWindow.confidence,
      };
      expect(summary).toMatchSnapshot();
    });
  }
});
