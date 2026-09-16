# Signoff: Print Request count parity across Show Queue and summary surfaces

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-plan.md` |
| Review | `docs/workflow/reviews/2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-formal-review.md` |
| Test report | `docs/workflow/reviews/2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-test-report.md` |
| Owner DEV QA | `docs/workflow/reviews/2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-owner-dev-qa-checklist.md` |
| Follow-up | `portal-unqueue-capacity-cache-and-studio-cancel-parity` (signed off same day) |
| Final status | **approved_with_notes** |

---

## Summary

Canonical Designs/Items count contract applied across Studio Show Queue, Portal request surfaces, Add-to-Show summaries, Staff Inbox glance, and related helpers. Owner DEV QA initially **FAIL WITH FOLLOW-UPS** (stale Portal cache after unqueue; Studio staff delete vs Portal cancel). Follow-up goal closed with Owner **PASS**; this parent Signoff is approved with those notes.

---

## Changes Delivered

### Behavior
- Full-request surfaces: source-aware Designs + summed item quantities from live items.
- Selected-show surfaces: non-canceled allocation Designs/Items/tiers/price/capacity from one active set.
- Canceled history retained without inflating current counters; History only when canceled-only.

### Documentation Updated
- DATA_MODEL count contract, WORKFLOWS, TESTING, promotion manifest delta

---

## Tests

### Automated
- Focused cross-surface suite as recorded in test report (171 then 115 parity reruns; 0 failed in those runs)
- Typechecks / changed-file lint / Studio+Functions builds as recorded

### Manual
- Owner DEV QA: initial FAIL WITH FOLLOW-UPS → follow-up **PASS** closes the blocking items
- Clarified non-bug: CR022 is 2 designs / 25 prints; personal-cap overflow after refresh was correct

### Human approvals
- Owner continuous Implement → Test → QA prep for parent; Owner PASS on follow-up
- Production promotion: **not requested / not granted**

---

## Risks and Follow-ups

- Functions/Portal App Hosting promotion still cumulative via pre-production manifest
- Next: selected-PR live sync Studio ↔ Portal

---

## Final Status

**approved_with_notes**
