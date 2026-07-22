# Plan: Portal Add-to-Show inspect past / closed days

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Goal id | `portal-add-to-show-inspect-closed-days` |

---

## Goal

In Portal **Add to Show**, customers can click any calendar day that has a show — including past shows and shows past the add cutoff — and see **CLOSED** plus final capacity (spots left / taken). They cannot add prints to those shows. Open/future allocatable shows behave as today.

## Background

Cutoff-closed upcoming slots already use a CLOSED badge, but past shows use **PAST**, omit cutoff meta, and calendar days with only past shows stay disabled. Owner wants historical/locked capacity visibility without enabling queueing.

## Scope

### In Scope
- Shared `ShowPicker` / `buildShowPickerOptions`: past + past-cutoff → CLOSED; days with shows clickable; closed/past slots selectable for inspect
- Default slot pick on a closed-only day still focuses a slot for display
- Portal `PortalQueueToShowModal`: cutoff/closed meta for past calendar shows; **Add to show** remains gated on allocatable + fit
- Day markers treat CLOSED like completed (not open blue)
- Unit tests for option build / day marker / default id

### Out of Scope
- Changing queue cutoff rules or backend eligibility
- Expanding how far back `listPortalAllocatableShows` loads (already ~2 months)
- Production deploy
- Studio staff override of past shows (staff already use separate allocatable list; inspect-only via shared picker is OK)

---

## Affected Areas

### Files / Modules (expected)
- `packages/show-picker/src/buildShowPickerOptions.ts`
- `packages/show-picker/src/ShowPicker.tsx`
- `packages/show-picker/src/getDefaultShowPickerOptionId.ts` (+ tests)
- `packages/show-picker/src/getShowPickerDayMarker.ts` (+ tests)
- `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx`

### Architecture Impact
- [x] None (shared picker UX only)

### Security Impact
- [x] None — Add still requires allocatable show + existing callable checks

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Portal Add-to-Show calendar; Studio shares ShowPicker (inspect past days)

### Migration Impact
- [x] None

---

## Approach

1. Map `past || pastCutoff` → status **CLOSED** (warning) in `buildShowPickerOptions`; keep `isSelectable` false for queue.
2. Calendar: any day with shows is clickable; closed/past slots clickable for selection/inspect (visual disabled style OK); `getDefaultShowPickerOptionId` falls back to first option when none queueable.
3. Portal: provide closed cutoff meta for past non-allocatable shows; keep `canConfirmFull` / primary button gated.
4. Day marker: treat CLOSED as completed-style marker.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Show-picker unit tests | `npx tsx --test packages/show-picker/src/*.test.ts` | yes |
| Shared cutoff/capacity if touched | existing tests | if needed |

### Manual
| Check | Expected |
|-------|----------|
| Click past show day | Day selects; slot shows CLOSED + capacity; Add disabled |
| Click cutoff-locked same-day show | CLOSED + capacity; Add disabled |
| Click open future show | OPEN + countdown; Add works when fit OK |

---

## Human Checkpoints Anticipated
- Manual UI PASS after implement

## Risks
| Risk | Mitigation |
|------|------------|
| Accidental queue to closed show | Primary button + callable still require allocatable |

## Rollback
Revert show-picker + PortalQueueToShowModal commits.

## Open Questions
- None — CLOSED label for both past and cutoff-locked per owner.

## Approval
- Review doc: docs/workflow/reviews/2026-07-22-portal-add-to-show-inspect-closed-days-review.md
- Verdict: **approved**
