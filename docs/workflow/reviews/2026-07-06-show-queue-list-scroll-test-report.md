# Show Queue List Scroll Test Report

Date: 2026-07-06

## Scope

Implemented the approved layout-only change for the Show Queue and Print Requests left rails:

- Added route-specific page-content classes for `/show-queue` and `/print-requests`.
- Constrained those routes to the available app content height so the whole page is no longer the
  primary scroll surface for long left-side lists.
- Restyled the shared left rail to match the AI Processing queue panel pattern: secondary-surface
  panel, border, restrained radius, sticky placement, non-scrolling tabs/header, and internal list
  scrolling.
- Updated left-rail request/show rows to use flatter AI-style list-item treatment while preserving
  selected, hover, and Show Queue full/over-capacity states.
- Preserved stacked/narrow layout with a capped rail height and a scrollable detail/workspace area.

No service, hook, IPC, Firebase, data model, Whatnot sync, allocation, print request status, or design
status logic changed.

## Tests Run

```bash
npx tsc --noEmit
```

Result: PASS.

```bash
npm run lint
```

Result: PASS.

```bash
npx vite build
```

Result: PASS. Renderer, Electron main, and preload builds completed. Existing circular manual-chunk
warning remains.

```bash
git diff --check
```

Result: PASS, standard Windows LF/CRLF warnings only.

## Manual QA

Not run in this session. Recommended manual checks:

- Open `/show-queue` with enough shows to overflow the rail.
- Confirm Upcoming/Past tabs stay visible and only the show list scrolls.
- Open `/print-requests` with enough requests to overflow the rail.
- Confirm Working/Queued/Printed tabs stay visible and only the request list scrolls.
- Confirm both rails visually match the AI Processing queue panel.
- Confirm stacked/narrow layout remains usable.
