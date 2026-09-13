# Review: Customer Account Identity WS3 Full Account Merge

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-29-customer-account-identity-management-ws3-full-account-merge-plan.md` |
| Verdict | **approved** (owner plan approval 2026-08-29) |

---

## Summary

The WS3 plan correctly scopes **owner-only Merge Accounts** as distinct from WS2 **Transfer Username**, re-verifies repo state after WS1/WS2 delivery, and proposes staged resumable merge aligned with existing propagation/lock/preview patterns. Storage UID migration and continuable-request policy differences vs WS2 are explicitly flagged. **Do not implement until owner resolves `[NEEDS OWNER DECISION]` items and approves plan.**

---

## Critical-risk challenge (14-point)

| # | Area | Verdict | Notes |
|---|------|---------|-------|
| 1 | Firestore ownership completeness | pass_with_notes | Matrix covers Appendix A; gangSheet indirect linkage needs implement-time confirm |
| 2 | Storage UID migration safety | pass_with_notes | Plan requires copy-verify-delete; no utility exists — must be first-class in implement |
| 3 | Auth deletion/disable timing | **owner decision** | Plan recommends disable-first; not binding until owner chooses |
| 4 | Working-request invariant | pass_with_notes | Dual continuable BLOCK; source-only reassign differs from WS2 — document in ADR |
| 5 | Request snapshot immutability | pass | Aligns with `propagateCustomerIdentitySnapshots` rules |
| 6 | CR → IR traceability | pass_with_notes | Plan cites conversion callable; implement must add contract tests |
| 7 | Show allocation integrity | pass_with_notes | Snapshot freeze explicit; optional customerId backfill TBD |
| 8 | Merge job resumability | pass | Mirrors propagation cursor model |
| 9 | Identity locking | pass | Reuse WS1/WS2 lock helper on both customers |
| 10 | Username reservation safety | pass | Reuse WS2 txn — do not fork |
| 11 | Activity historical truth | **owner decision** | Recommendation: no rewrite; WS4 query alias |
| 12 | Source tombstone semantics | pass_with_notes | Add `mergedAt`/`mergedBy` fields in DATA_MODEL at implement |
| 13 | Post-merge query behavior | pass_with_notes | Merged tab recommendation; Portal `isMerged` gate missing today |
| 14 | Partial failure recovery | pass | Explicit no-rollback policy |

---

## Architecture

- Does not rubber-stamp master plan: notes missing callables, `customerMergeJobs`, Storage helper, Portal merged gate, placeholder naming drift (`dupe-src` vs `merged-src`).
- Correctly separates WS2 username-only tool from WS3 merge.
- Reuses `propagateCustomerIdentitySnapshots`, `customerAccountEligibility`, `customerUsernameTransfer` — approved.

---

## Required changes before implement

1. Owner resolves five `[NEEDS OWNER DECISION]` clusters in plan.
2. Add ADR at implement (proposed FP-154) documenting merge tombstone + continuable reassignment policy.
3. Confirm `customerMergeJobs` vs on-customer job state in implement design doc (plan recommends dedicated collection).
4. Firestore rules + indexes section must be expanded at implement (preview collection operation type `account_merge`).

---

## Blockers

None for **plan approval**. Implementation blocked until owner approves plan + decisions.

---

## Verdict rationale

Plan is **architecturally sound**, **bounded**, and **grounded in post-WS2 repo inspection**. Critical risks are surfaced with honest gaps (Storage, push, activity query). **approved_with_changes**.

---

## Next step

Owner reviews plan + decisions → **`APPROVE WS3 PLAN`** → Implement phase (DEV only).
