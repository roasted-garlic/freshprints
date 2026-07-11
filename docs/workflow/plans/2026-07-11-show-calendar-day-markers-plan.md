# Plan: Show calendar day markers for full and completed shows

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-11-show-calendar-day-markers-review.md |

---

## Goal

In the shared `ShowPicker` calendar, give days with **full** or **completed** shows a distinct circle/dot treatment (not the same accent as open shows), so customers and staff can scan availability at a glance.

## Scope

### In Scope

- Derive a per-day marker from that day’s options: `open` | `full` | `completed`
- Priority when mixed: open → full → completed
- CSS: warning-styled circle/dot for full; success-styled for completed; keep accent for open
- Unit tests for marker helper
- Applies to Portal and Studio (shared picker)

### Out of Scope

- Changing slot cards / badges
- Filtering full/completed days out of the calendar
- New status enums or backend changes

---

## Approach

1. Add `getShowPickerDayMarker(options)` in `@fresh-prints/show-picker`
2. Map date → marker from `optionsByDateKey`
3. Apply `has-shows-open` / `has-shows-full` / `has-shows-completed` classes + aria hints
4. Style number ring + dot with `--color-warning` / `--color-success`

---

## Test Strategy

- Unit: marker priority / empty / mixed days
- Manual optional: open queue-to-show and confirm full vs open day circles differ

---

## Approval

- Verdict: approved (narrow UI polish)
