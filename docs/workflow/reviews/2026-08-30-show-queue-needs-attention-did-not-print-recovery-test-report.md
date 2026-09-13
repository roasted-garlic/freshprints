# Test Report — Show Queue Needs Attention Did Not Print Re-queue Recovery

| Field | Value |
|-------|-------|
| Date | 2026-08-30 |
| Goal | `show-queue-needs-attention-did-not-print-recovery` |
| Plan | `docs/workflow/plans/2026-08-29-show-queue-needs-attention-did-not-print-recovery-plan.md` |
| Final status | **passed_with_notes** |

---

## Summary

Final test reconciliation before signoff after owner DEV QA **PASS**. Focused recovery, contract, route, and scoped Rules suites pass. Full global `npm run test:rules` retains pre-existing expression-budget failures in unrelated suites (documented at Owner Edit Show checkpoint; not re-run as blocking for this goal).

---

## Automated tests

| Suite | Command | Result |
|-------|---------|--------|
| Recovery + requeue (shared + functions + Studio contract) | `npx tsx --test packages/shared/src/utils/showProductionRecoveryRequeue.test.ts packages/shared/src/utils/showProductionRecovery.test.ts functions/src/lib/showProductionRecoveryRequeue.test.ts apps/studio/src/renderer/src/features/upcoming-shows/showProductionRecovery.contract.test.ts` | **84 pass / 0 fail** (focused run 2026-08-30) |
| Print Requests route / Needs Re-queue triage | `npx tsx --test apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.test.ts` | **13 pass / 0 fail** |
| Combined focused signoff sweep | Same + `printRequestRoutes.test.ts` | **92 pass / 0 fail** |
| Scoped Show Queue Rules (emulator) | `tests/firebase/showQueueAllocation.rules.test.ts` | **18/18 pass** (deploy rules file; Owner Edit Show checkpoint) |
| Functions build | `npm --prefix functions run build` | **pass** (implementation review evidence) |

### Rules suite disposition (accurate classification)

| Scope | Result | Notes |
|-------|--------|-------|
| Scoped Show Queue allocation + owner-edit metadata tests | **pass** | `showQueueAllocation.rules.test.ts` **18/18** on deployed DEV rules |
| Full `npm run test:rules` (global) | **not claimed passing** | At Owner Edit Show checkpoint, broader suite hit **pre-existing Firestore Rules expression-budget failures in unrelated suites**. Not re-run as signoff gate for this accepted Show Queue goal. |

---

## Manual tests

| Area | Result | Approved by |
|------|--------|-------------|
| Primary Did Not Print → Move unprinted to another show | **PASS** | owner |
| Secondary Did Not Print → Release only + Needs Re-queue | **PASS** | owner |
| DEV fixture lifecycle (Upcoming → Needs Attention) | **PASS** | owner |
| Allocation permission repair | **PASS** | owner |
| Owner Edit Show QA enabler | **PASS** | owner |
| Production untouched | **PASS** | owner |

---

## Session corrective tests (2026-08-30, post-implementation-review)

Additional fixes during extended DEV QA (not blocking signoff scope expansion):

| Fix area | Test evidence |
|----------|---------------|
| Working filter `All` stability | `printRequestRoutes.test.ts` — explicit All filter preserved |
| Add to Show calendar (allocatable only) | `AddToShowModal.staffGangSheet.contract.test.ts` — pass |
| Past show historical export eligibility | `showExportEligibility.test.ts` — pass |
| Historical allocation capacity display | `showDisplayAllocatedQuantity.test.ts` — pass |

---

## Verdict

**passed_with_notes** — All goal-scoped automated and owner manual tests pass. Global Rules expression-budget debt remains documented and non-blocking for this DEV acceptance signoff.
