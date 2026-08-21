# Review: Amendment 1 — Past + Printing Show Queue Auto-Completion

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-plan.md` |
| Parent | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-plan.md` (Formal Review **approved**) |
| Goal id | `print-request-shared-sizing-and-queue-integrity` |
| Verdict | **approved** |

---

## Summary

Amendment 1 correctly traces the owner defect to a **display-only** Upcoming/Past split plus a UI that **hides Finish the moment a Printing show becomes Past**. The proposed fix reuses the existing authoritative `markShowPrintingFinished` path (timer + exact allocations + exact request reconciliation), hardens it for idempotent auto-invocation, and adds a manual **Mark Complete** on that same path. It does not invent a second Past definition, a badge-only patch, a Staff Gang Sheet shortcut, or a new scheduled Function. Combined implementation with the parent sizing plan remains blocked on **explicit owner approval**.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Whatnot Past + `printing` only. No capacity/cutoff/import/sizing rewrite. Parent sizing scope preserved. |
| Architecture alignment | pass | Component → Hook → Service → Firestore. One Finish writer. No UI Firebase. |
| Security impact addressed | pass | Same `canManageUpcomingShows`. Exact-show allocations. Split-request rule kept. No new public API. |
| Data model impact addressed | pass | No schema/enum additions. Documents existing `printing` → `completed`. ADR-FP-139 at Implement. |
| Backend impact addressed | pass | No Function/scheduler/Rules/index expected. STOP if that changes. |
| Test strategy adequate | pass | Boundary equality, closed-app load, open/canceled, race, split request, timer, failure. |
| Human checkpoints identified | pass | Owner STOP now; later DEV QA; later deploys; no prod data edit; scheduler forbidden without new approval. |
| Roadmap alignment | pass | Show Queue lifecycle integrity; Phase 9 still parked. |
| Documentation plan | pass | ADR-FP-139 + narrow DATA_MODEL/workflow note; no historical rewrite. |
| No silent scope expansion | pass | Does not auto-complete `open` Past shows; excludes Staff Gang Sheets; no production mutation. |

---

## Architecture Review

**Findings:**

- Authoritative Past rule is `getShowScheduleTab` / `scheduledStartAt.toDate().getTime() > now.getTime() ? upcoming : past`. Equality is Past. Amendment correctly forbids a second date helper.
- Finish is Studio `writeBatch`, not a callable. Auto-complete must stay on that service method.
- Staff Gang Sheet **Mark Complete** is `completeStaffGangSheetAndOpenNext` and must not be reused for Whatnot shows. Plan states this clearly.
- `canMarkFinished = isPrinting && !isPastScheduledShow` is the product hole. Service Finish already allows Past. Exposing Finish as **Mark Complete** when Past is the smallest UI fix.
- Idempotency must be inside `markShowPrintingFinished`. Current throw on non-`printing` would make auto-complete flaky. Rules allow `completed → completed` same-status writes, so a lost race could otherwise rewrite timer fields — transaction/compare-and-skip is required, not a React “already ran” flag.
- Shared Studio `now` is required. Today the list memo freezes `now` until `surfaceShows` changes, while the printing timer re-renders every second and hides Finish. Auto-complete and tab classification would disagree without one clock.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- Auto-complete is a privileged write. Gating on the logged-in staff user and `canManageUpcomingShows` matches Finish.
- Allocation query remains `where("upcomingShowId", "==", showId)`. Request completion still fans out only those `printRequestId`s and then evaluates **all** allocations for each request (split-show safety).
- No secrets, no Rules relaxation, no new public Portal surface.
- Do not run auto-complete in a context without a real staff caller.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] Production Studio release (later)
- [x] Production Function deploy is **not** required for this amendment; parent sizing callable remains a later checkpoint
- [x] Production stuck-show repair only after Studio rollout, via product UI — no console edit in this goal
- [x] Any new scheduled Function / Cloud Scheduler / trigger / IAM — **not approved here; STOP**

---

## Data Model Review

**Findings:**

- `PRINTING` badge = persisted `productionStatus === "printing"`, including paused.
- Finish terminal = `completed`. `fully_printed` is compat-only; do not auto-complete it and do not start writing it.
- No migration. Existing production row is repaired by Finish after release.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- Existing schedulers (Algolia catalog reconcile, assisted-creation proof purge) are unrelated. Reuse was correctly rejected.
- Closed-app behavior without opening Studio is an accepted limitation of this plan.
- Parent sizing Function change does not overlap this amendment’s write path.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Owner-required cases are mapped to existing Finish tests plus new predicate/hook/idempotency tests.
- If Finish write shape becomes a transaction, update `tests/firebase/studioProductionTimer.rules.test.ts` rather than weakening Rules.
- Manual QA checklist is DEV-only and sufficient after automated pass.

**Required changes:**

- [x] None

---

## Documentation Review

**Findings:**

- Durable rule belongs in ADR-FP-139 at Implement, not a rewrite of historical Show Queue phases.
- Parent plan/review now cross-link this amendment.

---

## Overlap with parent sizing plan

Review agrees with the ordered Implement:

1. Shared sizing + persist/queue barriers + allocate/callable + export/gang
2. Then Finish idempotency + auto-complete + Mark Complete

Only overlapping application file: `upcomingShowService.ts` (allocate vs Finish methods). Re-read at each step. Do not revert sizing.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None for this review. Combined **Implement** is still owner-gated.

---

## Verdict Rationale

The defect is proven from current HEAD: Past is a client time comparison that never mutates production state, and Finish is hidden when Past even though the service can finish Past Printing shows. The amendment reuses the one authoritative Finish operation, keeps exact-request reconciliation, covers paused Printing, covers Studio-open and Studio-closed-then-reopen, and refuses new scheduler infrastructure. Tests and checkpoints are adequate. Approved as a plan, not as permission to implement.

---

## Next Step

**STOP.** Await owner review of the combined findings (parent sizing plan + this Amendment 1). Do not begin implementation until the owner explicitly continues.

After owner approval: Implement both scopes in the order above on `C:\coding\fresh-prints` / `development` only.
