# Implementation Review: Donated Designs overflow menu Amendment 1

Date: 2026-08-01
Verdict: **approved_with_note**

## Findings

- `DangerOverflowMenu` now uses React's existing `createPortal` API to render into `document.body`; no new dependency or custom provider was introduced.
- Positioning is deterministic and trigger-relative. Normal conditions place the menu six pixels below the trigger; measured collision flips only when below is insufficient and above has more room.
- Coordinates are clamped to an eight-pixel viewport margin and recomputed on resize and capture-phase scroll.
- The intake panel's clipping boundary remains unchanged, so unrelated panel content cannot overflow.
- Outside-click correctly treats both the trigger root and portaled panel as inside regions. Escape, first-item focus, trigger focus return, selection close, accessibility state, and row/filter reset are preserved.
- The only menu action remains **Delete unused upload…** on the existing owner-gated selected-row deletion flow. Opening and closing remain state-only.
- No Whatnot, backend, Rules, permission, or data behavior changed.

## Note

Automated verification passes. Owner visual/interaction QA on development must be rerun before promotion.
