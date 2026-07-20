# Test Report: Portal request detail — newest-first (match cart)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-19-portal-detail-newest-first-match-cart-plan.md |
| Implementation | session 2026-07-19 detail newest-first |
| Overall | **passed** |

---

## Summary

Shared newest-first sort + Portal insert-before duplicate math covered by unit tests (16 pass). Portal typecheck and Functions build passed. `duplicatePortalPrintRequestItem` redeployed to **fresh-prints-dev**. Owner manual QA required for detail/cart order, duplicate-right, and resize stability.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit | `npx tsx --test packages/shared/src/utils/printRequestItemDisplayOrder.test.ts apps/portal/.../sortWorkingCurrentRequestItems.test.ts apps/portal/.../sortCurrentRequestDrawerGroups.test.ts` | 0 | pass | 16 tests |
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | |
| Functions build | `npm --prefix functions run build` | 0 | pass | Also via predeploy |
| Deploy (dev) | `firebase deploy --only functions:duplicatePortalPrintRequestItem --project fresh-prints-dev` | 0 | pass | Successful update |
| Lint | — | — | skip | Prior session noted pre-existing next img rule noise |
| Build portal | — | — | skip | Logic + Function only |

---

## Manual Test Checkpoint

See: docs/workflow/reviews/2026-07-19-portal-detail-newest-first-match-cart-manual-qa.md

---

## Manual result

Owner **PASS** 2026-07-19 (“PASS on everything”); closed with duplicate-preparing signoff.

## Signoff Readiness

- [x] Ready for signoff: **yes** — `docs/workflow/reviews/2026-07-19-duplicate-preparing-feedback-signoff.md`
