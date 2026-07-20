# Review: Replace Cap A/B split with one simple request-per-show limit

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-19-simple-request-per-show-limit-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly stops Cap A/B remainder QA, inventories Cap A and split/remainder surfaces, and defines a single limit `L` with atomic full-queue-or-reject, empty Current Request after queue, and one Portal request per customer per show. Scope is bounded (no production, no Studio staff split, upload quotas preserved). Proceed to implementation only after **owner approval** at the human checkpoint.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | In/out explicit; prior FP-101 / Cap A clamp workflows stopped |
| Architecture alignment | pass | Queue callable remains authority; Portal UX defensive only |
| Security impact addressed | pass | Server uniqueness + fit; Cap A client counters removed (good) |
| Data model impact addressed | pass | Settings field strategy + counter stop-write; ADR supersessions listed |
| Backend impact addressed | pass | Callable contract table complete |
| Test strategy adequate | pass | Remove/update/add named; manual QA checklist |
| Human checkpoints identified | pass | Implement approval + post-deploy manual QA; no production |
| Roadmap alignment | pass | Small Managed Items #3 simplification |
| Documentation plan | pass | DECISIONS / DATA_MODEL / BACKEND / ROADMAP / handoff |
| No silent scope expansion | pass | Staff split and uploads explicitly out |

---

## Architecture Review

**Findings:**
- Layering preserved: services/callables own limits; UI reflects `L` and show disablement.
- Prefer keeping `printRequestSplitAllocation` for Studio; Portal-only delete of remainder helpers is correct.
- Empty Current Request via virtual empty (create on next add) matches existing one-working-request invariant and avoids orphan drafts.

**Required changes:**
- [x] None structural — see Required Changes for implement-time clarifications

---

## Security Review

**Findings:**
- Removing Cap A reduces attack surface (no daily counter forge path); working-max + queue uniqueness must stay Admin-callable enforced.
- One-request-per-show must be enforced in the queue transaction with fresh reads (plan states this).
- Customers still must not write `printRequestItems.quantity` client-side (existing rules).

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [x] Production deploy of Functions/settings — later phase only

---

## Data Model Review

**Findings:**
- Ignoring legacy `dailyDesignsAddedToRequestsLimit` while enforcing `maxQuantityPerShowPerCustomer` as `L` is a safe soft migration.
- Optional mirror-write of Cap A=`L` for rollback is good; implement should document which option was chosen.
- Cap A collection can remain for wipe/cleanup without new indexes.

**Required changes:**
- [ ] At implement: pick **one** Settings write strategy (ignore Cap A vs mirror `L`) and record in ADR.

---

## Backend Review

**Findings:**
- Dropping `selections` / remainder from queue types is correct; validation should reject unexpected `selections` with a stable error (forward-compat for stale clients) or ignore — prefer **reject or ignore safely**; document in implement notes.
- Deprecating `getPrintRequestDailyDesignQuota` requires Portal unwire in same deploy window to avoid console errors.

**Required changes:**
- [ ] Implement: unwire Portal daily quota callable in the same soft-deploy batch as Functions removal/stub.

---

## Testing Review

**Findings:**
- Inventory of tests to remove/update/add is sufficient.
- No Functions integration test for queue txn exists today — unit coverage on fit + validation + uniqueness helpers is acceptable; manual QA covers E2E.

**Required changes:**
- [ ] None blocking

---

## Documentation Review

**Findings:**
- New ADR must explicitly supersede FP-096 Cap A, FP-100, FP-101 remainder while carrying forward one-request↔one-show.
- ROADMAP #3 and handoff CURRENT-STATE must describe the **planned** model until implement completes.

**Required changes:**
- [ ] None beyond plan’s documentation list

---

## Required Changes (if approved_with_changes)

1. **Settings write strategy:** At implement start, choose ignore-legacy Cap A field **or** mirror `L` into Cap A for one release; record in new ADR (plan already recommends keep field name `maxQuantityPerShowPerCustomer`).
2. **Deploy batching:** Soft-deploy Functions + Portal Cap A unwire together so clients do not call a removed daily-quota callable.
3. **Stale client `selections`:** Queue validation must not create remainder if an old Portal still sends `selections` — ignore selections and require full fit, or reject with upgrade/soft-reload message (prefer reject with soft-reload copy).

These are implement-time constraints, not plan blockers.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Plan meets all owner brief requirements (Cap A inventory, split inventory, settings, callables, indexes/txns, one-request-per-show, atomic fit, empty Current Request, over-limit compat, files, tests, ADR supersession, dev deploy, manual QA, rollback). Prior remainder/Cap A clamp workflows are correctly stopped. **approved_with_changes** for three implement-time clarifications; **do not implement** until owner explicitly approves.

---

## Next Step

**Human checkpoint:** Owner replies to approve implementation (see workflow state). Then Implement → Test → Signoff. No application code changes in this planning/review pass.
