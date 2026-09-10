# Signoff: Show Queue / Internal Sheet print-time estimate

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Plan | `docs/workflow/plans/2026-09-10-show-queue-print-time-estimate-plan.md` |
| Verdict | **approved** |

---

## Summary

Studio Show Queue / Internal Sheet glance shows Standard-layout estimated print time (8 s/in), including label-band feed length, inches rounded up, with feet in parentheses. Placed on the status pill row (right-aligned), not in the stats grid.

## Tests

- Automated: `npx tsx --test` on efficiency layout + glance stats — pass
- Owner visual QA: **PASS** (2026-09-10)

## Human approvals

- Owner visual QA PASS
- Owner authorized commit/push of these changes only

## Follow-ups

None for this polish. Maintenance prerequisite remains paused separately.
