## Why HRV is missing

Apple Health may be connected, but the app currently:
1. Does not ask iOS for HRV read permission.
2. Does not query the HRV sample type.
3. Estimates HRV from resting heart rate and always shows the "Estimated without HRV" note.

So this is a code-side integration gap, not a HealthKit/baseline problem.

## Fix

### 1. Request HRV permission
In `src/services/healthkit.ts`, add `"heartRateVariability"` to `AUTH_READ_PERMISSIONS`. Users who already authorized will be re-prompted only for this new type on next launch.

### 2. Query the real HRV samples
- Add `hrv: "heartRateVariabilitySDNN"` to `QUERY_SAMPLE_TYPES`.
- In `fetchHealthData`, query HRV for today (last 24h) and the 30-day baseline window, plus a 7-day daily series using `queryDailyValues(..., "avg")`.
- Plugin returns SDNN in **seconds**, so multiply by 1000 to get the millisecond values the ApexScores algorithm expects.

### 3. Use real values, fall back gracefully
- `hrv_today` → average of today's HRV samples; if none, keep the current RHR-derived estimate.
- `hrv_baseline_30d` → average of 30-day samples; same fallback.
- `hrv_7d` → real 7-day daily averages; same fallback per missing day.
- Track a boolean `hasRealHRV` (true if today OR baseline returned ≥1 real sample).

### 4. Expose the flag
- Extend `AppleHealthData` with an optional `hrv_is_estimated: boolean`.
- Set it in `fetchHealthData` (`!hasRealHRV`).
- Thread it through wherever scores are built (likely `apexScores.ts` → score factor objects consumed by `ScoreCard` / `ScoreDetailModal`).

### 5. Conditional disclaimer
In `src/components/ScoreDetailModal.tsx`, the block that renders
`"Estimated without HRV — your device's HealthKit integration…"` (currently shown unconditionally for `brain`/`alert`/`book` icons) should only render when `hrv_is_estimated === true`.

### 6. Native sync note
Because this changes Info.plist usage requirements (new HKQuantityTypeIdentifierHeartRateVariabilitySDNN read), the user must run `npx cap sync ios` after pulling. The `NSHealthShareUsageDescription` string already in Info.plist covers HRV — no plist change needed — but the permission sheet will re-appear once.

## Files touched
- `src/services/healthkit.ts` — permission, query, baseline, 7-day series, estimated flag.
- `src/algorithms/apexScores.ts` — propagate `hrv_is_estimated` into the score factor output (small change).
- `src/components/ScoreDetailModal.tsx` — gate the disclaimer on the flag.

## Verification
- Web preview: flag stays `true` (DEFAULT_HEALTH_DATA), disclaimer keeps showing — no regression.
- On device after `npx cap sync` + reinstall: accept the new HRV prompt, open a score modal; if Apple Watch / iPhone has logged HRV in the last 24h or 30d the disclaimer disappears and factor bars use real HRV.
- Console: `HealthKit computed AppleHealthData` log should show realistic `hrv_today` (typically 20–80 ms) instead of the RHR-derived number.
