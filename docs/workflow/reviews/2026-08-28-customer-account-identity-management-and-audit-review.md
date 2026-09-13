# Review: Customer Account Identity Management, Duplicate Resolution, Safe Delete, Account Merge, and Activity Audit Trail

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-28-customer-account-identity-management-and-audit-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly frames duplicate-account resolution as distinct from ordinary username edits, builds on the existing `applyCustomerProfileUpdate` / reservation / propagation architecture, and proposes a phased workstream split that appropriately defers high-risk merge until history-gated hard delete and username transfer are proven. Repo inspection grounds `ownerDeleteUser` limitations, ADR-FP-115 tombstone vs history-free delete, and ADR-FP-071 merge blocking. Formal review approves planning to proceed to implementation **workstream-by-workstream** after listed plan amendments and owner checkpoints.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Four workstreams; explicit out-of-scope |
| Architecture alignment | pass | Reuses profile update, propagation, permission patterns |
| Security impact addressed | pass | Owner-only destructive ops; preview ≠ auth |
| Data model impact addressed | pass_with_changes | New fields/events need DATA_MODEL detail in WS1/3 |
| Backend impact addressed | pass | Callable inventory complete |
| Test strategy adequate | pass | 38+ tests mapped |
| Human checkpoints identified | pass | Inventory, merge map, deploy gates |
| Roadmap alignment | pass | Phase 6 identity corrective |
| Documentation plan | pass | ADRs 148–150 proposed |
| No silent scope expansion | pass | Reset username deferred |

---

## Architecture Review

**Findings:**

- Correctly extends existing layers rather than a parallel username system.
- Merge job resumability appropriately mirrors `identitySnapshotPropagation`.
- Storage UID migration called out as async stage — critical for uploads/assisted.
- `customerActivityEvents` as new collection is cleaner than overloading unimplemented `auditLogs`.

**Required changes:**

- [x] Document explicit **query model for merged customers**: Studio activity must query events and print requests by survivor `customerId` **and** include reassigned source history (plan implies; WS4 must specify combined query or `includeMergedFromCustomerIds` parameter).
- [ ] WS3 design must specify behavior when survivor and source share **same email domain but different Auth** — confirm no accidental email collision on `users` collection.

---

## Security Review

**Findings:**

- Owner-only gates for hard delete, transfer, merge align with risk.
- Retaining admin `updateCustomer` matches "do not silently narrow permissions."
- Hard delete frees username — acceptable only with eligibility gate; plan enforces.
- Preview tokens must be single-use and short-lived (plan mentions; WS2 must specify TTL, e.g. 15 minutes).

**Required changes:**

- [ ] Add explicit rule: **hard delete and merge Apply must log actor uid + preview checksum** in `customerActivityEvents` for forensic traceability.
- [ ] Confirm `listCustomerActivityEvents` denies helpers if `canViewAuditLogs` is owner/admin only.

**Human approval needed before production:**

- [x] Hard-delete blocker inventory (owner)
- [x] Merge ownership map (owner)
- [x] Production Functions deploy for all new callables
- [x] Firestore rules/index deploy

---

## Data Model Review

**Findings:**

- Appendix A inventory is thorough and matches codebase grep results.
- `designIssueReports` gap in `ownerDeleteUser` correctly noted — new hard delete must block, not orphan.
- `isDisabled` vs `isDeleted` distinction is necessary and well-separated from tombstone.
- `nextPrintRequestSequence` merge policy flagged for owner — recommend **max** as plan states.

**Required changes:**

- [ ] Before WS1 implement: add `isDisabled`, `disabledAt`, `disabledBy`, `disabledReason`, `identityOperationLock` to DATA_MODEL.md customer entity (plan references but appendix should list in main entity spec during WS1).
- [ ] Define merge tombstone fields on source `customers` doc: `isMerged`, `mergedIntoCustomerId`, `mergedAt`, `mergedBy` — names authorized in WS3 only after owner checkpoint #3.

---

## Backend Review

**Findings:**

- Refactoring `ownerDeleteUser` helpers into shared module is correct — avoids duplicate destructive tooling.
- `transferCustomerUsername` transactional design addresses race window.
- Callable count is large but justified by workstream split.

**Required changes:**

- [ ] WS1: specify whether `hardDeleteCustomerAccount` remains **dev-project-gated** initially (recommended: yes, same as `ownerDeleteUser` until production approval).
- [ ] WS3: document maximum batch sizes per merge stage (reuse 400 write limit).

---

## Testing Review

**Findings:**

- Test matrix covers acceptance criteria 1–23 comprehensively.
- Contract tests for Studio deep links and permission gates appropriate.
- Dual Working block scenario (fixture D) is essential.

**Required changes:**

- [ ] Add integration test: hard delete blocked when `designIssueReports` exist (closes `ownerDeleteUser` gap).
- [ ] Add test: tombstoned customer cannot be hard-deleted or merged without explicit error.

---

## Documentation Review

**Findings:**

- ADR-FP-148–150 appropriately capture policy exceptions.
- BACKEND.md and DEPLOYMENT.md updates needed per workstream deploy.

---

## Required Changes (approved_with_changes)

1. **WS4 query spec:** Document how activity/PR cards aggregate data for merged source accounts (survivor-centric query + optional source tombstone card linking survivor).
2. **Preview token TTL and single-use semantics** in WS2 callable design.
3. **DATA_MODEL.md** customer field additions in WS1 (not deferred to WS3 for disable fields).
4. **Initial hard-delete project gate:** dev-only until owner production approval — state explicitly in WS1 implementation plan section.
5. **Forensic audit:** Apply operations record preview checksum + actor on activity events.

---

## Blockers

None for **Plan phase**. Implementation blocked until:

- Owner approves hard-delete inventory (checkpoint — binding per user brief)
- Owner approves merge map (checkpoint)
- Review `approved_with_changes` items incorporated into WS1 kickoff notes

---

## Verdict Rationale

The plan answers all 30 required questions with repo-grounded evidence, preserves existing username architecture, correctly quarantines `ownerDeleteUser`, and sequences risk appropriately. Merge and audit are large but bounded. Minor gaps (merged-customer query model, preview token details, DATA_MODEL field timing) are addressable as implementation notes without replanning. **approved_with_changes** — proceed to WS1 implementation after workflow state advances and owner checkpoints are recorded.

---

## Answers to plan questions (verification)

| # | Question | Plan answer quality |
|---|----------|---------------------|
| 1 | Customer-owned data | Complete — Appendix A |
| 2 | Hard-delete safety | Complete — §6 |
| 3 | Reuse ownerDeleteUser? | Yes — helpers only, narrowed |
| 4 | What ownerDeleteUser deletes | Complete — §4 |
| 5 | Production capable? | No — dev quarantined |
| 6 | Auth delete/disable | Tombstone disable; hard delete deletes; merge disables source |
| 7 | Atomic username transfer? | Yes — txn reservation model |
| 8 | Tombstone policy changes | ADR-FP-148 duplicate transfer exception |
| 9 | Merge ownership map | Appendix A |
| 10 | Do not rewrite | Immutable snapshots + CR name — §11 |
| 11 | At-creation truth | Propagation write-once — §3 |
| 12 | Immutable CR names | Preserved — §15 |
| 13 | Dual Working prevention | Block — §14 |
| 14 | Queued/printing/printed | Reassign — §15 |
| 15 | Upload migration | §16 |
| 16 | Assisted migration | §17 |
| 17 | Other data | §18 |
| 18 | Source doc after merge | Tombstone — §11 |
| 19 | Source Auth | Disable/delete post-migration — §13 |
| 20 | Disable supported? | Tombstone yes; reversible disable proposed — §8 |
| 21 | Re-enable? | Not today; proposed — §8 |
| 22 | Reusable audit? | auditLogs unused; derived trail exists — §21 |
| 23 | Reconstructable activity | printRequests timestamps — §21 |
| 24 | Future explicit events | §22 |
| 25 | Event model/indexes | §22, §26 |
| 26 | Bounded card queries | §23, §26 |
| 27 | Permissions | §27 |
| 28 | Reset username | Defer — §20 |
| 29 | Workstream split | §37 |
| 30 | Production components | Functions, rules, indexes, Studio — §29–31 |

---

## Next Step

**STOP** — Plan + Formal Review complete per user instruction. No implementation.

When owner is ready: start **WS1** managed sub-goal; record owner checkpoint approvals in workflow state; incorporate required changes into WS1 implementation scope.
