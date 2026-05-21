# Hybrid Calibration Gate

Show every score from day 1 so the app feels alive, but make it unmistakable that the numbers are still calibrating until enough HealthKit history exists. Visuals carry the gate; algorithm weights stay untouched.

## Calibration tiers

```text
Day 1–6    Warming Up      All scores visible, baseline-dependent terms dampened
Day 7–29   Calibrating     Trend-based scores unlock at reduced visual confidence
Day 30+    Calibrated      Full personal baselines, no chip
```

Per-score readiness:

| Score | Day 1–6 | Day 7–29 | Day 30+ |
|---|---|---|---|
| Study Capacity | ready | ready | ready |
| Peak Study Window | window shown, low conf | medium conf | high conf |
| Cognitive Readiness | warming | calibrating | calibrated |
| Retention Outlook | warming | calibrating | calibrated |
| Burnout Risk | warming | calibrating | calibrated |

## What the user sees

- A small "Calibrating · day X / 30" chip on each gated ScoreCard, in muted teal.
- A dashed/animated ring around the score icon while calibrating (subtle shimmer), replaced by the solid ring at day 30.
- Score value rendered at reduced opacity (~75%) and with a faint diagonal hatched overlay on the card while warming.
- One-line helper under the value: "Numbers sharpen as Athena learns your rhythm."
- A single dismissible banner on the Index page the first time the user lands post-HealthKit-sync: "Your first week is calibration — scores will get more accurate each day."
- Score detail modals get a "Why is this calibrating?" expandable note explaining what each tier unlocks.

## Technical details

1. **New helper `src/algorithms/calibration.ts`**
   - `getCalibrationDays(firstSyncDate: Date): number`
   - `getCalibrationTier(days): "warming" | "calibrating" | "calibrated"`
   - `getScoreCalibration(scoreKey, days)` returns `{ tier, label, confidence }` per score.
2. **First-sync timestamp**
   - Add `healthkit_first_sync_at timestamptz` to `profiles` (migration). Set on first successful HealthKit sync inside `services/healthkit.ts` if null.
3. **Plumb into Index**
   - `src/pages/Index.tsx` computes `calibrationDays` once and passes a `calibration` prop to each `ScoreCard`.
4. **ScoreCard visual gate**
   - New optional `calibration?: { tier, label }` prop. When tier ≠ `calibrated`: add hatched overlay, dim value, render chip + helper line.
   - Reuse existing teal token; no new colors.
5. **ScoreDetailModal**
   - Add a collapsible "Calibration status" section sourced from the same helper.
6. **Algorithms untouched**
   - `apexScores.ts` weights, formulas, and HRV gating stay exactly as they are. Calibration is purely presentational + a future hook point.

## Out of scope (deliberate)

- No weight changes, no dampening of baseline terms in math yet.
- No quiz-driven chronotype override.
- No hard lockout — every score remains tappable and readable.
