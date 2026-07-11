# Plan: Portal show calendar defaults to next open show

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-11-portal-show-calendar-default-open-review.md |

---

## Goal

When a customer opens the Portal “queue to show” calendar, auto-select the **soonest show that still has open capacity**, not a full soonest show. If every listed show is full, keep today’s fallback (first option) so the picker still has a selection.

## Background

`PortalQueueToShowModal` currently defaults to `showPickerOptions[0]` (soonest by scheduled start). Customers often land on a full show and must manually advance the calendar. Allocatable shows from `listPortalAllocatableShows` are already sorted soonest-first and expose capacity via `buildShowPickerOptions` (`isFull`).

## Scope

### In Scope

- Shared helper to pick default show id from ordered `ShowPickerOption[]` (prefer first `!isFull`, else first option)
- Prefer a show that can fit the current request quantity when that is knowable (same order)
- Wire `PortalQueueToShowModal` default selection to that helper
- Unit tests for the helper

### Out of Scope

- Studio `AddToShowModal` default behavior (no auto-select of soonest today)
- Changing allocatable-show list API or capacity rules
- Blocking selection of full shows (user may still tap them; confirm remains capacity-gated)
- Progress-rail / other parked goals

---

## Affected Areas

### Files / Modules (expected)

- `packages/show-picker/src/getDefaultShowPickerOptionId.ts` (new)
- `packages/show-picker/src/getDefaultShowPickerOptionId.test.ts` (new)
- `packages/show-picker/src/index.ts` (export)
- `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx`

### Architecture Impact

- [x] Details: Small pure helper in `@fresh-prints/show-picker`; Portal modal remains the only UI consumer for now.

### Security Impact

- [x] None

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Queue-to-show modal opens with a non-full (and preferably fitting) show selected / calendar day focused.

### Migration Impact

- [x] None

---

## Approach

1. Add `getDefaultShowPickerOptionId(options, canFitById?)`:
   - Empty → `null`
   - If `canFitById` provided → first option that returns true
   - Else / if none fit → first option with `!isFull`
   - Else → `options[0].id`
2. In modal open effect, replace `showPickerOptions[0]?.id` with helper + `canFitPrintRequestOnShow` for the request total.
3. Unit-test ordering / full / fit / empty cases.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `npx tsx --test packages/show-picker/src/getDefaultShowPickerOptionId.test.ts` | yes |
| Typecheck | Portal / show-picker via existing workspace check if available | yes if quick |

### Manual

- [x] Details: Optional smoke — open queue-to-show with soonest show full; confirm calendar lands on next open show.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (light smoke; optional if unit coverage clear)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other:

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| All shows full → still selects first | Low | Explicit fallback; confirm still blocked by capacity message |
| “Open” vs “fits this request” ambiguity | Low | Prefer can-fit, then not-full, then first — matches queue UX |

---

## Rollback Plan

Revert helper + modal one-liner; behavior returns to always selecting soonest.

---

## Documentation Updates Required

- [ ] None required beyond workflow artifacts (behavior tweak only)

---

## Open Questions

- [x] None — “open” = not full; prefer can-fit when quantity known.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-11-portal-show-calendar-default-open-review.md
- Verdict: pending
