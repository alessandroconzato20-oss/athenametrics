# Algorithm Testing Infrastructure — All 4 Layers

Build a complete, dev-only testing system around the scoring algorithms. None of this ships to end users — fixtures and the playground live behind a dev route, tests run in CI/local only.

## Layer 1 — Unit Tests (automated, invisible to you)

Add Vitest test files next to each algorithm in `src/algorithms/`:
- `apexScores.test.ts` — covers every exported scoring function (sleep, HRV, stress, motivation, rest, study, overall ApexScore)
- `burnoutTrends.test.ts` — 7/30-day trend calculations
- `peakWindow.test.ts` — chronotype + late factors + Rest override
- `studyBlocks.test.ts` — High/Medium/Low block duration logic
- `atRisk.test.ts` — academic (60%) vs survey (15%) weights
- `wellbeingDampening.test.ts` — 0.5 impact multiplier

Each test asserts: known input → known output, boundary values (0, max), null/missing handling, no NaN/negative outputs.

Setup: install `vitest`, `@testing-library/react`, `jsdom`, `@testing-library/jest-dom`; add `vitest.config.ts` and `src/test/setup.ts` per the standard frontend testing setup.

## Layer 2 — Scenario Fixtures (you review once, then automatic)

Create `src/test/fixtures/personas.ts` with ~10 named personas. Initial drafts:

1. **Well-rested athlete** — 8h sleep, HRV 75, low stress, high motivation
2. **Sleep-deprived student** — 4h sleep, HRV 32, high stress
3. **Burnt-out finalist** — chronic low sleep, declining 30-day HRV trend
4. **Anxious before exam** — normal sleep but high stress + low motivation
5. **Recovery day** — Rest override active
6. **Night owl mid-semester** — late chronotype, late study factor
7. **New user, no HealthKit** — missing HRV/sleep data
8. **Consistent grinder** — flat metrics, steady study logs
9. **Comeback student** — improving 7-day trend after bad month
10. **At-risk profile** — failing academic weight + poor survey

Then `src/test/fixtures/snapshots.ts` stores expected outputs. A test (`personas.test.ts`) runs every persona through every algorithm and diffs against snapshots. When you change a weight, failing snapshots show exactly which persona shifted and by how much.

Workflow: you skim personas once (~20 min), tell me which expected outputs feel wrong, I adjust.

## Layer 3 — Interactive Playground (your main tool)

New dev-only route `/dev/algorithms` (guarded by `import.meta.env.DEV` — returns 404 in production builds, never reachable by end users).

Features:
- **Inputs panel** — sliders/number fields for every algorithm input (sleep hours, HRV, stress 1-10, motivation 1-10, rest toggle, chronotype, study minutes, mastery %, etc.)
- **Live outputs panel** — every score recomputes on input change: ApexScore, sub-scores, burnout trend value, peak window time, recommended block duration, at-risk status
- **Persona loader** — dropdown to load any Layer-2 persona as a starting point
- **Diff mode** — compare two input sets side-by-side
- **Export** — copy current input/output as a new persona fixture

Built with existing UI tokens (beige/teal palette, semantic tokens — no hardcoded colors).

## Layer 4 — Property-Based Tests (automated guardrails)

Add `fast-check` as a dev dependency. Create `src/algorithms/*.property.test.ts` files that generate thousands of random valid inputs and assert invariants:
- All scores stay within `[0, 100]`
- Never `NaN`, `Infinity`, or negative
- Monotonicity where expected (more sleep → sleep score never decreases, all else equal)
- Rest override always reduces study-block duration
- Missing HealthKit data → graceful fallback, no crash

Runs in <5s, catches edge cases humans miss.

## Technical section

**New dependencies (dev only):**
- `vitest`, `@vitejs/plugin-react-swc`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `fast-check`

**New files:**
```
vitest.config.ts
src/test/setup.ts
src/test/fixtures/personas.ts
src/test/fixtures/snapshots.ts
src/test/fixtures/personas.test.ts
src/algorithms/*.test.ts          (one per algorithm)
src/algorithms/*.property.test.ts (one per algorithm)
src/pages/dev/AlgorithmPlayground.tsx
src/components/dev/InputPanel.tsx
src/components/dev/OutputPanel.tsx
src/components/dev/PersonaLoader.tsx
src/components/dev/DiffView.tsx
```

**Routing:** add `/dev/algorithms` to the router wrapped in `{import.meta.env.DEV && <Route ... />}` so the route literally does not exist in the production bundle.

**Production safety:**
- Playground page and dev components tree-shaken out of prod build (DEV guard)
- Test files (`*.test.ts`, `*.property.test.ts`) excluded by Vite from the app bundle by default
- Fixtures live under `src/test/` — not imported by any app code
- Zero new runtime dependencies for end users

**Build order:** Layer 1 + setup → Layer 2 fixtures → Layer 3 playground → Layer 4 property tests. Each layer is independently useful; if anything breaks mid-way the app keeps working.

## What you do after this ships

1. Review the 10 personas once, flag any that don't match reality
2. Open `/dev/algorithms` whenever a score "feels off", reproduce it, tell me the expected output
3. Everything else (unit + property tests + snapshot diffs) runs automatically
