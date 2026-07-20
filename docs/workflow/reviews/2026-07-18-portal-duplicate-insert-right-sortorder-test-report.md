# Test Report: Portal duplicate insert-right + durable sortOrder

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-18-portal-duplicate-insert-right-sortorder-plan.md |
| Implementation | session 2026-07-18 |
| Overall | **passed_with_notes** |

---

## Summary

Automated unit + Portal typecheck + Functions build passed. `duplicatePortalPrintRequestItem` deployed to **fresh-prints-dev**. Portal soft-reloaded on http://localhost:3100. Owner manual QA still required for grid adjacency / resize stability.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test packages/shared/src/utils/printRequestItemDisplayOrder.test.ts apps/portal/features/print-requests/utils/sortWorkingCurrentRequestItems.test.ts` | 0 | pass | 8 tests |
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | |
| Functions build | `npm --prefix functions run build` | 0 | pass | |
| Deploy (dev) | `firebase deploy --only functions:duplicatePortalPrintRequestItem --project fresh-prints-dev` | 0 | pass | Successful update |
| Lint | — | — | skip | Narrow change; not blocking |
| Portal full build | — | — | skip | Soft-reload sufficient for local QA |
| E2E | — | — | skip | Not configured for this flow |

---

## Failures (if any)

None.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Lint | Scope-limited; typecheck + targeted units covered |
| Full Portal build | Soft-reload on :3100 used instead |
| E2E | No project E2E for request detail duplicate |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Duplicate inserts right of source | pending | Owner |
| Resize keeps position | pending | Owner |
| Reload preserves order | pending | Owner |
| Cart order agrees | pending | Owner |

Manual test instructions: see below.

---

## Manual Test Checkpoint

**Feature / area:** Portal print request detail — duplicate insert-right + durable sortOrder  
**Why automated tests are insufficient:** Visual grid adjacency and live Firestore round-trip  
**Environment:** local Portal http://localhost:3100 against `fresh-prints-dev`  
**Prerequisites:** Soft-reloaded Portal; `duplicatePortalPrintRequestItem` deployed to fresh-prints-dev

### Steps
1. Open a draft/editing print request with ≥3 different designs. → **Expected:** cards ordered by `sortOrder` (stable left→right).
2. Duplicate a **middle** design. → **Expected:** copy appears immediately **to the right** of the source (optimistic and after save settles).
3. Hard-refresh the page. → **Expected:** same order preserved.
4. Resize one item (change size). → **Expected:** that card stays in the same list position.
5. Change qty on one item. → **Expected:** position unchanged.
6. Open Current Request drawer. → **Expected:** group order does not fight detail (earlier designs first by sortOrder).

### Pass criteria
- [ ] Duplicate sits directly right of source
- [ ] Reload keeps order
- [ ] Resize/qty do not reshuffle
- [ ] No production deploy performed

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

---

## Recommendations

None beyond owner manual QA.

---

## Signoff Readiness
- [x] All required automated checks pass OR failures documented
- [ ] Manual tests complete OR checkpoint pending
- [ ] Ready for signoff phase

**Next step:** manual-test-checkpoint
