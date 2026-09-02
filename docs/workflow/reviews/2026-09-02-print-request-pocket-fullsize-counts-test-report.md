# Test Report: Print Request Pocket / Full Size counts (amendment)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-09-02-print-request-pocket-fullsize-counts-amendment-plan.md |
| Overall | **passed** (automated) → **pending_manual** (Owner QA) |

---

## Summary

Focused classification, summary, UI wiring, and History regression suites: **46/46 pass**. No backend changes. Owner QA required for visual/context verification.

---

## Commands Run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit + contract + History | `npx tsx --test packages/shared/src/utils/gangSheetCustomerSectionSummary.test.ts apps/studio/.../printRequestQueryPlanning.test.ts apps/studio/.../printRequestPocketFullSizeCounts.contract.test.ts apps/studio/.../upcomingShowListSort.test.ts` | 0 | **pass** (46) |
| Full Studio tsc | skipped this pass | — | Prior session: pre-existing unrelated errors; goal files not implicated |
| Build | skipped | — | Display-only; verify via `dev:studio` |

---

## History regression

`upcomingShowListSort.test.ts`: **17/17 pass** (History DESC, Past DESC, Upcoming ASC, Current wiring).

---

## Manual Testing

Pending Owner QA — see `docs/workflow/reviews/2026-09-02-print-request-pocket-fullsize-counts-owner-qa.md`.

---

## Signoff Readiness

- [x] Automated checks pass  
- [ ] Owner QA pending  
- [ ] Combined signoff not ready  

**Next step:** Owner QA checkpoint
