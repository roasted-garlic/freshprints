# Signoff: Portal Unqueue Capacity Cache and Studio Cancel Parity

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Signoff by | Owner DEV QA + Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-formal-review.md` |
| Test report | `docs/workflow/reviews/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-test-report.md` |
| Owner DEV QA | **PASS** — follow-up remove/re-add validation accepted as part of the parent QA result |
| Final status | **approved_with_notes** |

## Summary

The narrow follow-up is complete in DEV and its blocker on the parent count-parity goal is closed.
Successful Portal queue/unqueue mutations invalidate both allocatable-show cache layers. Studio
staff customer-request removal now soft-cancels allocations with audit fields, preserving the
same History-only trail as Portal while active capacity and counters continue to exclude canceled
rows.

## Changes Delivered

- Unified Portal read/session cache invalidation at successful queue and unqueue boundaries.
- Studio staff remove changed from allocation deletion to audited cancellation.
- Existing active-only quantity recomputation and canceled-history display semantics preserved.
- Focused cache and callable contract coverage added; no Rules, schema, migration, or data change.

## Evidence

- Follow-up focused contracts: **6/6 PASS**.
- Portal and Functions typechecks: **PASS**.
- Changed-file ESLint: **PASS**.
- Owner DEV QA accepted the remove → re-add scenario and confirmed current counts did not inflate
  from canceled historical rows.

## Production Boundary

No production deploy, Portal publication, Functions deployment, data mutation, migration,
backfill, Rules/Storage Rules change, index change, IAM change, or secret/configuration change
occurred. The exact production record remains deferred to the parent manifest’s post-promotion
read-only smoke.

## Verdict

**approved_with_notes**

The exact historical production record cannot be live-validated with corrected runtime code until
production promotion. Root cause was proven through read-only production evidence, automated
production-shaped regression coverage passed, and Owner DEV QA validated the remove/re-add
historical-allocation scenario in DEV. Production smoke must confirm the originally affected card
after promotion.

## Workflow Complete

- [x] Follow-up state reconciled through the parent Signoff
- [x] Parent handoff and cumulative promotion manifest updated
- [x] No production action performed
