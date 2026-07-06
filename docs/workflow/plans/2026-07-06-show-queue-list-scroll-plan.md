# Show Queue List Scroll Plan

Date: 2026-07-06

## Goal

Make the Show Queue's left show list scroll independently instead of making the whole page scroll as
more shows are added. Also restyle the left rail on both Show Queue and Print Requests to match the
AI Processing queue panel treatment.

## Scope

In scope:

- Show Queue route `/show-queue`.
- Print Requests route `/print-requests`.
- Layout/CSS changes for the existing shared two-column rail/workspace pattern.
- Style both left rails in the same family as AI Processing's `.ai-review-queue-panel`:
  secondary-surface panel, border, restrained radius, sticky desktop placement, hidden panel overflow,
  non-scrolling header/tabs, and a dedicated internal list scroller.
- Keep Show Queue's Upcoming/Past tab buttons visible while the list below them scrolls.
- Keep Print Requests' Working/Queued/Printed tab buttons and rail header controls visible while the
  request list below them scrolls.
- Give both lists a useful desktop height based on the available viewport and app header, not a tiny
  fixed box.
- Preserve usable stacked/mobile layout.

Out of scope:

- Data model changes.
- Firestore rules or indexes.
- Whatnot import parsing/sync behavior.
- Show allocation, print request, or design status logic.
- New dependencies.

## Architecture Impact

This is renderer UI layout only.

Expected files:

- `src/renderer/src/shared/components/AppShell.tsx` may receive a Show Queue route modifier class, matching
  the existing `/ai-review` and `/designs` route-specific content-area modifiers. It may also need a
  `/print-requests` modifier if the shared rail layout needs the same fixed-height shell there.
- `src/renderer/src/styles/layout.css` may add Show Queue and Print Requests page-content shell rules
  so those routes can use the available viewport height without the whole page becoming the primary
  scroll surface.
- `src/renderer/src/styles/components/print-requests.css` may add or adjust shared rail styles used
  by both pages, but changes must be checked against both `/show-queue` and `/print-requests`.
- `src/renderer/src/styles/components/show-queue.css` may add Show Queue-specific constraints for
  `.upcoming-shows-page`, `.upcoming-shows-layout`, `.print-requests-rail`, and
  `.print-requests-rail-list`.

No service, hook, IPC, Firebase, or Electron logic should change.

## Data Model Impact

None.

## Firebase Impact

None. No Firestore rules/indexes/deploy.

## Security Considerations

None beyond preserving existing role-gated actions. This does not alter permissions or data writes.

## UI Considerations

- Match the AI Processing rail pattern from `src/renderer/src/styles/components/ai-review.css`:
  `.ai-review-queue-panel`, `.ai-review-tabs`, and `.ai-review-queue-list`.
- The Show Queue and Print Requests rail lists should use `overflow-y: auto` with `min-height: 0` on
  their flex/grid ancestors so they actually scroll.
- The lists should have a decent height on desktop, using the available page height rather than a small
  arbitrary max height.
- The tab/header areas should remain outside the scrolling list so the rail controls stay visible.
- On narrower stacked layouts, each rail list can keep a capped height so staff can scroll the list
  without losing the detail/workspace panel far below.
- Use existing visual styles and tokens; no hardcoded color changes.

## Risks

- CSS changes to shared `.print-requests-*` classes could affect the Print Requests page if not scoped
  carefully; this is now intentional for rail styling, but must not disturb unrelated request detail
  cards or modals.
- Incorrect `min-height: 0` placement could fail to create an internal scroll area.
- Too aggressive page overflow rules could hide content on small screens.

## Test Plan

Run:

```bash
npx tsc --noEmit
npm run lint
npx vite build
git diff --check
```

Manual QA:

- Open `/show-queue` with enough shows to overflow the rail.
- Confirm the left show list scrolls independently.
- Confirm the page/detail area is not forced to scroll just because the show list is long.
- Confirm Upcoming/Past tabs stay visible while the list scrolls.
- Open `/print-requests` with enough requests to overflow the rail.
- Confirm the left request list scrolls independently.
- Confirm the request detail/workspace area is not forced to scroll just because the request list is
  long.
- Confirm Working/Queued/Printed tabs and any rail header controls stay visible while the list scrolls.
- Confirm both left panels visually match the AI Processing queue panel style.
- Confirm the stacked/narrow layout remains usable.

## Review Gate

Implementation is blocked until the user approves this plan.
