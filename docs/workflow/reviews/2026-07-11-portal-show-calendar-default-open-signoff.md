# Signoff: Portal show calendar defaults to next open show

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Plan | docs/workflow/plans/2026-07-11-portal-show-calendar-default-open-plan.md |
| Review | docs/workflow/reviews/2026-07-11-portal-show-calendar-default-open-review.md |
| Test report | docs/workflow/reviews/2026-07-11-portal-show-calendar-default-open-test-report.md |
| Verdict | **approved** |

---

## Delivered

- `getDefaultShowPickerOptionId` in `@fresh-prints/show-picker` — prefers can-fit, then first non-full, then first option
- `PortalQueueToShowModal` uses that helper for initial calendar/selection default
- Unit tests: 6/6 PASS

## Manual tests

- Requested: optional smoke when soonest show is full
- Completed: not required for signoff (logic covered by unit tests)
- Result: N/A — optional follow-up

## Human approvals

- None required (no deploy / security / data changes)

## Open follow-ups

- Optional: apply same default in Studio Add-to-show if desired later
- Resume parked: portal-print-progress-rail (callable deploy + QA)

## Verdict

Approved. Goal complete.
