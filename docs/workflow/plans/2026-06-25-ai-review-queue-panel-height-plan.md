# Plan: AI Review queue panel height matches workspace

**Date:** 2026-06-25

## Goal

Left queue panel height follows right main/workspace panel on all AI Review tabs.

## Root cause

- `max-height: calc(100vh - 9rem)` tied to viewport, not main panel
- `grid-template-rows: auto auto 1fr` forces list row to expand
- `align-items: start` prevents column height coupling

## Implementation

1. **ResizeObserver hook** — measure `.ai-review-main-panel`, set `--ai-review-main-panel-height` on `.ai-review-layout`
2. **Queue panel CSS** — flex column, shrink-wrap, `max-height: var(--ai-review-main-panel-height)`; list scrolls when capped
3. **Sticky** — keep `position: sticky` on desktop; cap via max-height prevents mismatch
4. **Mobile (≤1100px)** — `max-height: min(var(--ai-review-main-panel-height), 38vh, calc(100vh - 10rem))`

## Out of scope

Column width, breakpoints, other AI Review features
