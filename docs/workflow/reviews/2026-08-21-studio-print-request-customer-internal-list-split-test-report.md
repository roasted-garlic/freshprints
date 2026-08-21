# Test Report: Studio Print Request Customer vs Internal List Split

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-08-20-studio-print-request-customer-internal-list-split-plan.md |
| Implementation | session on `development` (uncommitted) |
| Overall | **passed** |

---

## Summary

Automated checks for the Studio list split passed: query planner pair, kind filter/search/switch, routes, merge, loading derivation, ≥200 DPI sizing, Add Designs item-id planner, Studio typecheck, and lint. The reviewed composite index was added to `firestore.indexes.json` and deployed to **`fresh-prints-dev` only**. Owner Studio QA is required before signoff. No production action.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Typecheck | `npx tsc --noEmit` (cwd `apps/studio`) | 0 | pass | Fixed `requestTab` narrowing after first fail |
| Lint | `npm run lint` | 0 | pass | After adding `activeListKind` to `handleAddedToShow` deps |
| Unit tests (list split) | `npx tsx --test` planner, kind filter, merge, loading, routes, active-tab filter | 0 | pass | 50 tests |
| Unit tests (sizing + Add Designs) | `npx tsx --test` `printRequestItemSizing.test.ts`, `printRequestItemSizingAndNaming.test.ts`, `planPrintRequestDesignSelectionWrites.test.ts`, `usePrintRequestSelectionMode.test.ts` | 0 | pass | 38 tests; includes ≥200 DPI and resized-item Add Designs |
| Build | — | — | skip | Not a packaging/release change |
| Integration | — | — | skip | Not required |
| E2E | — | — | skip | Manual Studio QA |
| Backend/rules | — | — | skip | Rules unchanged |
| DEV indexes | `firebase deploy --only firestore:indexes --project fresh-prints-dev` | 0 | pass | Project `fresh-prints-dev` only. Composite `isInternal + queueTab + updatedAt + __name__` present in `firebase firestore:indexes` listing. |

---

## Failures (if any)

None remaining. First Studio typecheck failed on `PrintRequestsPage.tsx` (`queueTab` still `undefined` in ternary). Fixed by assigning a narrowed local `queuedTab`. Lint initially failed on missing `activeListKind` hook dependency. Both re-run pass.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Studio Vite build | Not a packaging/release change |
| Portal typecheck / build | Portal out of scope |
| Functions build | Functions unchanged |
| Rules tests | Rules unchanged |

---

## Index deploy record

| Item | Value |
|------|-------|
| Command | `firebase deploy --only firestore:indexes --project fresh-prints-dev` |
| Exit | 0 |
| Target | **fresh-prints-dev only** |
| Production | **not** deployed |
| Index | `printRequests.isInternal ASC, queueTab ASC, updatedAt DESC, __name__ DESC` |
| Rules | Compiled as part of the indexes deploy read; **rules were not the deploy target** and were not changed |

If Studio QA hits a Firestore index error on list/count, **STOP** and report. Do not add another index.

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Owner Studio Print Requests list split QA | PASS | Owner 2026-08-21. Kind switcher restyled to Users-page control during QA, then accepted. |

Manual test instructions: `docs/workflow/reviews/2026-08-21-studio-print-request-customer-internal-list-split-manual-checkpoint.md`

---

## Recommendations

- Confirm in Studio that Working/Queued/Printing/Printed counts are kind-scoped and that switching lists does not write request documents.
- If a request is missing from both lists, do not backfill in this goal; report it.

---

## Signoff Readiness

- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete OR checkpoint pending
- [x] Ready for signoff phase

**Next step:** signoff complete
