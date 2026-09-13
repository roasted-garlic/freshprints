# Review: Show Queue Past-Show Failsafe, Needs Attention, and Owner Override

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-27-show-queue-past-show-failsafe-and-owner-override-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly identifies the lifecycle gap: **Past schedule classification does not imply production completion**, and ADR-FP-139 only repairs Past + `printing`. Past + `open`/`full` with queued allocations is currently **unrecoverable** via Finish (rules + `resolveShowFinishMutationPlan`). The proposed **Needs Attention** tab, trusted **Functions** remediation callables, ADR-FP-071-safe release semantics, and **owner-only** override with preview/audit align with architecture, security, and data-model rules. Implementation is **not** Studio-only.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Out of scope explicit; no new productionStatus enum |
| Architecture alignment | pass | Callable layer; reuse reconciliation helpers |
| Security impact addressed | pass | Owner-only override; staff remediation gated |
| Data model impact addressed | pass | Optional audit fields documented |
| Backend impact addressed | pass | New callables required |
| Test strategy adequate | pass | 18-case matrix + contract tests |
| Human checkpoints identified | pass | DEV QA + legacy APPLY checkpoint |
| Roadmap alignment | pass | Phase 7 corrective |
| Documentation plan | pass | ADR-FP-149 + DATA_MODEL/BACKEND |
| No silent scope expansion | pass | Staff gang sheets excluded |

---

## Architecture Review

**Findings:**

- Tab partition is mutually exclusive (Upcoming / Needs Attention / Past)—prevents hiding stuck requests in normal Past history.
- Callable-first remediation avoids widening client Firestore rules for impossible Whatnot transitions.
- Reuses `derivePrintRequestListTab`, `evaluatePrintRequestCompletionEligibility`, and finish reconciliation rather than duplicating lifecycle logic.

**Required changes:**

- [x] Port finish/release transaction logic to shared module callable + Studio can share pure planners (avoid drift between `upcomingShowService` and Functions).

---

## Security Review

**Findings:**

- Owner override must remain **callable-only** with `loadCallerProfile` owner check (mirror `deleteEligibleUpcomingShow`).
- Staff remediation uses existing `canManageUpcomingShows`; override is narrower (owner).
- Preview endpoints must not leak cross-customer PII beyond what Show Queue already shows.

**Required changes:**

- [ ] None blocking

**Human approval needed before production:**

- Functions deploy + rules review when implementation reaches deploy phase (out of scope for this plan).

---

## Data Model Review

**Findings:**

- Optional `productionResolutionKind`, `productionResolvedAt`, `productionResolvedBy`, `productionOverrideReason` are backward compatible.
- No new `productionStatus` value—correct per owner constraint.

**Required changes:**

- [ ] Document max length / sanitization for `productionOverrideReason` in implement phase.

---

## Backend Review

**Findings:**

- Functions required for Whatnot `open|full → completed` remediation and bulk allocation cancel on Past shows.
- Existing `syncPrintRequestQueueTab` / triggers should fire after callable mutations (verify trigger paths in implement).

**Required changes:**

- [ ] Confirm `recomputeAndPersistQueueTab` invoked after callable allocation cancels (explicit call if triggers don't cover Admin writes).

---

## Testing Review

**Findings:**

- Plan includes ADR-FP-071 dual-continuable scenario and multi-show cases.
- Compositor-level parity not applicable; lifecycle integration tests required.

**Required changes:**

- [ ] Add Functions contract test for helper denied owner override (test matrix #14).

---

## Documentation Review

**Findings:**

- ADR-FP-149 + ADR-FP-139 cross-reference planned.

---

## Required Changes (approved_with_changes)

1. **Empty show v1:** Implement **manual one-click Close Empty Show** only; document optional auto-close as follow-up (owner open question #1—default per plan recommendation).
2. **Release request status:** Implement ADR-FP-071 guard (no `active→editing` when another continuable exists); default to allocation-truth **Working** tab (open question #2).
3. **Owner override v1 scope:** Ship Close Empty, Release, Mark Fulfilled, Force Completed; defer Reopen/Mark Started unless DEV QA proves need (open question #3).
4. **Shared transaction module:** Extract finish/release planners shared by Studio timer path and Functions callables to prevent logic drift.

---

## Blockers

None.

---

## Verdict Rationale

**approved_with_changes** — Plan is repo-grounded, addresses both Case A and Case B, respects Past ≠ Completed, and mandates Functions for trusted mutations. Required changes are clarifications and v1 scope defaults, not architectural rework.

---

## Next Step

**STOP** — Owner authorizes **Implement** phase. No code changes until authorization.

---

## SHOW QUEUE PAST-SHOW FAILSAFE — PLAN RESULT (summary for owner)

| # | Topic | Plan answer |
|---|--------|-------------|
| 1 | Root cause | Past schedule decoupled from production; ADR-FP-139 fixes printing-only; open+queued Past unrecoverable |
| 2 | Show state machine | `open|full|printing|fully_printed|completed|archived|canceled`; client timer + limited rules transitions |
| 3 | Allocation/request | Allocations drive queue tabs; finish → done + reconciliation |
| 4 | Needs Attention predicate | Past Whatnot + non-terminal production (`open|full|printing`) |
| 5 | Empty show | Close Empty Show callable → `completed` + audit; no PR/allocation writes |
| 6 | Show with PRs | Needs Attention row + Fulfilled vs Release callables |
| 7 | Fulfilled vs not | Fulfilled → done allocations + reconciliation; Release → cancel show allocations + completed unfulfilled |
| 8 | One-working-request | Skip `active→editing` if other continuable; derive Working tab |
| 9 | Multi-show | Cancel only this show's allocations; global recompute |
| 10 | Owner override | Owner-only preview/apply semantic actions + audit fields |
| 11 | Permission/audit | `isOwner`; resolution kind + reason fields |
| 12 | Tab UX | Upcoming / Needs Attention / Past (mutually exclusive for Past) |
| 13 | Auto vs manual | Filter + ADR-139 auto; remediation manual v1 |
| 14 | Stuck data | Same UI/callables; preview; owner checkpoint before bulk APPLY |
| 15 | Files | Listed in plan §Affected files |
| 16 | Functions | **Required** |
| 17 | Rules/indexes | Rules minimal if callable-only; indexes likely unchanged |
| 18 | Tests | 18-case matrix in plan |
| 19 | Owner DEV QA | Manual checkpoint in plan |
| 20 | Risks | False Printed, ADR-FP-071, multi-show—mitigated |
| 21 | ADR | ADR-FP-149 new; ADR-FP-139 amend |
| 22 | Owner decisions | 3 open questions with recommended defaults in Required Changes |
