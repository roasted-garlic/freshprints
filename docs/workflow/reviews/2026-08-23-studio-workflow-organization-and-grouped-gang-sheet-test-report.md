# Test Report — studio-workflow-organization-and-grouped-gang-sheet

**Date:** 2026-08-23  
**Phase:** Test  
**Goal:** `studio-workflow-organization-and-grouped-gang-sheet`

## Summary

Automated checks for this phase **passed**. Studio TypeScript compiles cleanly. Targeted unit/contract tests for WS1–WS5 (and related shared search parity) pass.

Owner manual DEV QA: **PASS** (all five workstreams).

## Commands Run

### Initial automated pass (implementation → test)

| Check | Command | Exit code | Result |
|-------|---------|-----------|--------|
| Typecheck (Studio) | `cd apps/studio && npx tsc --noEmit` | 0 | Pass |
| Unit / contract tests | `npx tsx --test` (WS1/WS3/WS5 + contracts, 24 tests) | 0 | Pass |

### Final verification (signoff)

| Check | Command | Exit code | Result |
|-------|---------|-----------|--------|
| Typecheck (Studio) | `cd apps/studio && npx tsc --noEmit` | 0 | Pass |
| Expanded unit / contract suite | `npx tsx --test` on shared gang-sheet + grouping + search + IPC validation + Studio/Portal search consumers | 0 | Pass (**100** tests) |

## Test Coverage Notes

| Workstream | Automated coverage |
|------------|-------------------|
| WS1 Print Requests by show | `groupPrintRequestsByShow.test.ts` — primary show selection, `+N` extra show counts, unassigned section ordering |
| WS2 Normalized Files modal | CSS-only; no automated visual test — covered by owner QA |
| WS3 Needs Review search | `aiReviewNeedsReviewSearch.test.ts` — 500 initial hydration, bounded continuation, no false empty state; Design Library AI-suggestion match |
| WS4 Design Library scroll | Implementation verified; owner QA PASS |
| WS5 Grouped gang sheet | `gangSheetEfficiencyLayout.test.ts` (regression contract), `gangSheetGroupedLayout.test.ts`, `gangSheetCacheFingerprint.test.ts`, `exportRequestValidation.test.ts` (layoutMode preserved), `showExportFilename.test.ts` (grouped base name), `gangSheetCacheRefresh.test.ts` |

## Efficiency / standard path regression

- Fingerprint tests assert omitted/`efficiency` layoutMode does not change cache keys vs legacy.
- `planEfficiencyGangSheetLayout` regression contract preserves interleave order and sheet capping.
- IPC validation omits `layoutMode` for standard generates (legacy main-process path).
- Owner QA confirmed standard Generate remains correct alongside grouped mode.

## Not Run (out of scope / not required for this phase)

| Check | Reason |
|-------|--------|
| `npm run lint` (root) | Not required for this signoff gate; recommend before Studio release |
| Studio `npm run build` / electron-builder | Deferred to Studio release workflow |
| Firebase rules emulators | No rules changes in this goal |
| E2E / Playwright | Not configured for these Studio flows |
| Portal App Hosting / Firebase deploy | Explicitly out of scope |

## Failures

None.

## Manual Test Checkpoint

**Environment:** Local Studio against DEV Firebase  
**Owner result:** `PASS` (2026-08-23)

| Workstream | Result |
|------------|--------|
| WS1 Print Requests grouped by show | PASS |
| WS2 Condensed/scrollable Normalized Files modal | PASS |
| WS3 Needs Review search | PASS |
| WS4 Design Library scroll preservation after save | PASS |
| WS5 Second grouped gang sheet generation mode | PASS |

Post-QA hardening (still within goal, owner re-verified during DEV QA): IPC `layoutMode` preservation, Standard/Grouped cache coexistence, `grouped` filenames/labels, modal UX (width, side-by-side tabs, tab switch loading).

## Verdict

**Test Status:** `passed_with_notes` → ready for signoff  
**Notes:** Lint and full Studio package build deferred to release; no Firebase/Portal/production actions in this goal.
