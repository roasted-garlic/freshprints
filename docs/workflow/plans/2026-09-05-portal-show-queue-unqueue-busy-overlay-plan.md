# Plan: Portal show queue/unqueue busy overlay

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | Portal `PortalQueueToShowModal`, `PortalUnqueueFromShowConfirmModal` |

---

## Goal

When a Portal customer adds a print request to a show or removes it from a show to edit, show a clear, centered busy modal on top of the existing UI so the app does not look hung (no reliance on small scroll-away status text).

## Background

After confirming add-to-show, customers only see faint “Updating show capacity…” near the top of the calendar modal while the primary button says “Adding…”. On short viewports that status is easy to miss. Remove-from-show only swaps the confirm button label. Owner asked for an overlay modal for both flows.

## Scope

### In Scope
- Shared Portal busy overlay component (spinner + title + short description; non-dismissible)
- `PortalQueueToShowModal`: show overlay for entire `isBusy` (submit + capacity celebration); remove inline “Updating show capacity…” status line
- `PortalUnqueueFromShowConfirmModal`: show overlay while `isSubmitting`
- Minimal CSS + contract/source tests

### Out of Scope
- Speeding up allocate/unqueue backend (deferred)
- Studio Add-to-Show / Show Queue remove overlays (staff; separate if needed)
- Changing celebration timing / capacity-bar animation duration
- Bidding acknowledgment copy changes

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/shared/components/PortalBusyOverlay.tsx` (new)
- `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx`
- `apps/portal/features/print-requests/components/PortalUnqueueFromShowConfirmModal.tsx`
- `apps/portal/styles/shell.css` or `requests.css` (overlay z-index / panel)
- Small contract test(s) under portal print-requests

### Architecture Impact
- [x] None (presentation-only)

### Security Impact
- [x] None

### Data Model Impact
- [x] None

### Backend / Environment Impact
- [x] None

### UI/UX Impact
- [x] Details: Blocking busy overlay above calendar/confirm modals; Escape/click-outside disabled while busy (already true for queue modal)

---

## Implementation Plan

1. Add `PortalBusyOverlay` reusing existing spinner styling; z-index above bidding-ack (`z-modal + 6`).
2. Wire into queue modal for `isBusy` with copy: **Adding to show…** / short wait message (covers submit + celebration).
3. Wire into unqueue confirm for `isSubmitting` with copy: **Removing from show…**.
4. Delete the scroll-dependent capacity status paragraph in the queue modal body.
5. Source/contract assertions that overlays render on busy flags.

## Test Strategy

- Automated: source contract tests for overlay usage + busy flags
- Manual: Portal add to show → overlay visible without scrolling; remove from show & edit → overlay visible until complete

## Human Checkpoints Anticipated

- Manual UI smoke on Portal localhost after implement (owner)

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Overlay hides capacity-bar celebration | Acceptable; wait timing unchanged so UX duration stays honest |
| z-index stacking vs bidding ack | Overlay only after ack closes; still use higher z-index |

Rollback: revert overlay component wiring; restore status paragraph if needed.

## Open Questions

None — owner specified overlay on both add and remove-to-edit.
