# Signoff: Customer Account Identity Management — WS3 Full Account Merge

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `customer-account-identity-management-ws3-full-account-merge` |
| Plan | `docs/workflow/plans/2026-08-29-customer-account-identity-management-ws3-full-account-merge-plan.md` |
| Review | `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws3-full-account-merge-review.md` |
| Implementation review | `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws3-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws3-test-report.md` |
| Final status | **approved** |
| Production | **NOT AUTHORIZED** |

---

## Summary

WS3 delivers owner-only **Merge Accounts** on `fresh-prints-dev`: preview/apply/status callables, resumable 19-stage merge jobs, Studio wizard + **Merged** directory tab, ADR-FP-154. Owner DEV QA **PASS** after a documented stage-order corrective.

Customer identity package (WS1 + WS2 + WS3) remains **DEV-only**; coordinated production promotion is deferred.

---

## Changes delivered

### Behavior

- Full account merge with survivor canonical identity and source merge tombstone
- Continuable print request policy (empty vs meaningful; dual-meaningful block)
- Storage migration when Auth UIDs differ; web push invalidation; favorites dedupe
- Append-only merge lifecycle events on `customerActivityEvents`
- `mergedSourceCustomerIds[]` on survivor for WS4 alias queries

### QA corrective history (preserved)

1. **Bug:** `acquire_locks` ran before `validate_preview`; eligibility rejected the job’s own locks → Apply failed with “Another identity operation is in progress.”
2. **Fix:** `validate_preview` → `acquire_locks`; release locks on later stage failure; Studio attestation + result UX polish.
3. **DEV ops:** Stale fixture locks cleared; `applyCustomerAccountMerge` redeployed only; failed job `844d604e-…` retained for audit.

### Documentation

- ADR-FP-154, WS3 plan/reviews/QA, implementation review corrective section

---

## Tests

See test report. Owner DEV QA: **PASS**.

| Manual | Result | Approved by |
|--------|--------|-------------|
| Transfer Username on DEV | PASS | Owner 2026-08-29 |
| Merge Accounts on DEV (post-corrective) | PASS | Owner 2026-08-29 |
| Merged tab / survivor canonical | PASS | Owner 2026-08-29 |

---

## Human approvals

| Approval | Status | Notes |
|----------|--------|-------|
| WS3 plan | obtained | 2026-08-29 |
| DEV deploy | obtained | Initial + corrective apply-only |
| DEV QA signoff | obtained | PASS |
| Production deploy | **not authorized** | Coordinated WS1–WS3 package deferred |

---

## Risks and known issues

| Item | Severity | Mitigation |
|------|----------|------------|
| No emulator merge E2E | medium | Unit/contract + owner DEV QA |
| Studio flat audit trail not merge-aware | low | WS4 planned |
| Production promotion deferred | info | Explicit owner gate |

---

## Deferred (roadmap)

- **WS4** — Customer activity + deep linking (Plan phase started)
- Production promotion of identity package
- Optional narrow Firestore indexes if WS4/QA requires

---

## Handoff package

`references/project-chatgpt-handoff/` — **not present in repo**; skipped per signoff skill.

---

## Verdict

**approved** — WS3 closed on DEV acceptance. FreshForge advances to WS4 Plan + Formal Review (implementation forbidden until owner approves WS4 plan).

---

## Workflow complete

- [x] `.cursor/workflow/state.md` updated
- [x] `ROADMAP.md` updated
- [ ] `references/project-chatgpt-handoff/` — N/A (path absent)

**Recommended next action:** Owner reviews WS4 plan + formal review; reply **APPROVE WS4 PLAN** to authorize implementation.
