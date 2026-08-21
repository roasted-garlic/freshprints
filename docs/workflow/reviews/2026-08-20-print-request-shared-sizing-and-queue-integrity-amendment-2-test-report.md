# Test Report: Amendment 2 — Studio Add Designs must not replay existing request items

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-2-plan.md` |
| Parent | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-plan.md` |
| Implementation | Uncommitted on `development` (this session, after parent + Amendment 1) |
| Overall | **passed** |

---

## Summary

Amendment 2 automated checks passed. Studio Add Designs save now plans writes by request item ID: existing catalog items are quantity-updated or skipped; only selections without `existingItemId` are created at default size. Parent sizing and Amendment 1 unit tests still pass. Owner combined DEV QA **PASS** (2026-08-20).

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Amendment 2 + parent unit | `npx tsx --test` on planner, selection-state, oversized-init, Studio sizing/naming, persistence barrier, shared sizing/persistence/queued-inches, schedule grouping, Finish plan | 0 | pass | 80 tests |
| Changed-file lint | `npx eslint` on Amendment 2 Studio TS files | 0 | pass | |
| Studio typecheck | `npx tsc --noEmit` from `apps/studio` | 0 | pass | After widening save-payload input type |
| Studio Vite build | `npx vite build` from `apps/studio` | 0 | pass | Renderer + electron + preload |
| Portal typecheck | not run | — | skip | No Portal code in Amendment 2 |
| Functions build | not run | — | skip | No Functions change |
| Full `npm run lint` | not run | — | skip | Changed-file eslint used |
| E2E | none configured | — | skip | |
| Rules tests | none expected | — | skip | No Rules change |

---

## Failures (if any)

None in the automated commands above.

Hook-file import of `buildSelectionStateFromRequestItems` originally failed under `tsx` because it pulled Firebase env. Hydration helpers were moved into the planner util so tests run without Vite env. That is in-scope testability, not a product change.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Portal typecheck/build | Amendment 2 is Studio-only |
| Functions build | No Functions change |
| Full `npm run lint` | Changed-file eslint covered the Amendment 2 surface |
| E2E | Not configured |
| Rules tests | No Rules/index change |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| QA 1 reproduction (resized Judas Priest + Gentle Parenting, then add other designs) | PASS | Owner `PASS` 2026-08-20 |
| QA 2 no-op Add Designs visit | PASS | Owner `PASS` 2026-08-20 |
| QA 3 repeated Add Designs sessions | PASS | Owner `PASS` 2026-08-20 |
| QA 4 explicit Duplicate then add unrelated | PASS | Owner `PASS` 2026-08-20 |
| QA 5 remove then Add Designs | PASS | Owner `PASS` 2026-08-20 |
| Parent Portal 14×21.1 sizing | PASS | Owner `PASS` 2026-08-20 |
| Parent Studio 14×21.1 sizing | PASS | Owner `PASS` 2026-08-20 |
| Portal request → Show Queue size preservation | PASS | Owner `PASS` 2026-08-20 |
| Explicit Duplicate independent sizes | PASS | Owner `PASS` 2026-08-20 |
| Past + Printing auto-complete | PASS | Owner `PASS` 2026-08-20 |
| Manual Mark Complete recovery | PASS | Owner `PASS` 2026-08-20 |

Manual test instructions: Amendment 2 plan QA 1–5, then parent + Amendment 1 re-QA listed below.

---

## Recommendations

- Owner combined DEV QA recorded **PASS** 2026-08-20.
- No production, Functions deploy, or data repair in this step.
- Accidental default-size duplicates already created in DEV data are not auto-deleted.

---

## Signoff Readiness

- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete OR checkpoint pending
- [x] Ready for signoff phase

**Next step:** signoff
