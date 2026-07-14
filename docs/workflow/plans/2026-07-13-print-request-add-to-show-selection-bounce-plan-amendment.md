# Plan amendment: Portal queue-to-show stay on detail + smooth celebration

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | ready_for_review |
| Amends | `docs/workflow/plans/2026-07-13-print-request-add-to-show-selection-bounce-plan.md` |
| Related review | `docs/workflow/reviews/2026-07-13-print-request-add-to-show-selection-bounce-review.md` |

---

## Goal (expanded)

1. **Portal:** After queue-to-show, stay on that print request’s **detail** page (do not bounce to `/requests?tab=queued` list).
2. **Studio + Portal:** Remove the post-save flicker where the show calendar disappears, reappears for a capacity celebration, then the page jumps/reloads harshly.

Studio selection-follow fix remains in scope (already implemented).

## Owner feedback

- Original intent was Portal; Studio fix is acceptable and should remain.
- Both apps: calendar goes away → comes back → page flickers → lands somewhere. Make the success path smoother.

## Scope

### In Scope
- `PrintRequestDetailView.handleQueuedToShow` — refresh in place; no list navigation
- `PortalQueueToShowModal` — keep calendar mounted; celebrate capacity in place; close cleanly
- `AddToShowModal` (Studio) — keep calendar mounted during submit/celebrate (no swap to progress-only body that unmounts the picker)
- Docs: WORKFLOWS / plan notes; manual checkpoint covers Portal + Studio smoothness

### Out of Scope
- Changing capacity-bar animation CSS fundamentals beyond keeping picker mounted
- Portal list-tab selection sync (N/A — detail is a separate route)

## Approach

1. Portal success: `reload` / refresh silently; update UI from derived `listTab`; **omit** `router.push('/requests?tab=queued')`.
2. Both modals: never replace the ShowPicker with a different body during submit/celebrate; show a compact status line; drive pending capacity fill on the **same** picker instance.
3. Close modal promptly after short in-place fill (keep `SHOW_CAPACITY_BAR_ANIMATION_MS` unless too long — prefer close after animation without a second remount).
4. Prefer silent parent reloads after close to avoid full-page loading flashes.

## Test Strategy

- Automated: existing shared tab-selection tests (unchanged)
- Manual: Portal queue-to-show stays on detail; Studio Add to Show no calendar unmount flicker; both land on the expected detail without list bounce
