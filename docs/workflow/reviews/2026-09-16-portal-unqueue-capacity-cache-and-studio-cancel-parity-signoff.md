# Signoff: Portal unqueue capacity cache + Studio cancel-parity remove

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-plan.md` |
| Review | `docs/workflow/reviews/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-formal-review.md` |
| Test report | `docs/workflow/reviews/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-test-report.md` |
| Owner DEV QA | `docs/workflow/reviews/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-owner-dev-qa-checklist.md` |
| Final status | **approved** |

---

## Summary

Closed the Owner DEV QA follow-up to print-request count parity: Portal Add-to-Show no longer keeps stale capacity/personal-spot usage after unqueue, Studio staff remove soft-cancels allocations like Portal (History only), and Show Queue remove Confirm shows busy feedback while the remove runs.

---

## Changes Delivered

### Behavior
- Successful Portal queue/unqueue invalidates allocatable-shows read + session caches.
- Studio `unqueueStudioCustomerPrintRequestFromShow` cancels allocations (audit timestamps) instead of deleting them; active counts still exclude canceled.
- Show Queue remove Confirm → **Removing…** + disabled Cancel/Confirm until complete.
- Durable docs updated for cancel parity and focused tests.

### Files Created
- Follow-up plan, formal review, test report, owner QA checklist, signoff
- Portal cache invalidation / session / service contract tests
- Functions Studio unqueue cancel contract test

### Files Modified
- Portal allocatable-shows cache, hook, show-selection service
- `functions/src/unqueueStudioCustomerPrintRequestFromShow.ts`
- Studio `UpcomingShowsPage.tsx` remove busy state
- `docs/WORKFLOWS.md`, `DATA_MODEL.md`, `TESTING.md`
- Show Queue staff UI contract tests

### Documentation Updated
- WORKFLOWS, DATA_MODEL, TESTING, workflow artifacts, promotion manifest notes as applicable

---

## Tests

### Automated
- Focused suite: **6 passed / 0 failed** (cache + cancel contracts)
- Show Queue UI contract suite: **15 passed / 0 failed** (includes remove busy feedback)
- Portal + Functions typecheck: pass
- Changed-file ESLint: pass

### Manual
- Owner DEV QA: **PASS** (2026-09-16)

### Human approvals
- Owner product direction: keep canceled history; staff/customer remove parity; canceled must not affect counts
- Owner DEV QA PASS
- Production deploy: **not requested / not granted**

---

## Risks and Follow-ups

- Studio cancel-parity in shared DEV/prod requires Functions deploy of the updated callable (unauthorized in this goal).
- Portal cache fix is client-side and ships with Portal App Hosting promotion when authorized.
- Next goal: selected Print Request live sync Studio ↔ Portal (scoped listeners).

---

## Final Status

**approved** — goal complete. Parent count-parity Signoff coordinated as approved with notes via this follow-up.
