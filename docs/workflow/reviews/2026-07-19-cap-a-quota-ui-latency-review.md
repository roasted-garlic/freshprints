# Review: Cap A quota UI latency (optimistic remaining)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Plan | docs/workflow/plans/2026-07-19-cap-a-quota-ui-latency-plan.md |
| Status | **approved** |
| Reviewer | Agent (light review; owner-reported hotfix) |

---

## Verdict

**Approved.** Narrow Portal-only fix: optimistic Cap A display from working-print deltas + detail-page optimistic cart patch. Server Cap A unchanged and remains authoritative.

## Checklist

- [x] Scope matches owner report (detail qty → Cap A lag)
- [x] No Cap B / nav-race scope creep (those stay parked)
- [x] Security: no client bypass of Cap A charge
- [x] Positive-only delta avoids false remaining after queue-to-show
- [x] Manual QA required before signoff

## Required Changes
None.

## Notes
Park Review Request nav-race and Cap B allotment phases while this hotfix runs.
