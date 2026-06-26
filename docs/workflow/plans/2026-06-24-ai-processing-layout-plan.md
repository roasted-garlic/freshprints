# Plan: AI Processing Page Layout — Scrollable Queue + Failed-State Whitespace

**Date:** 2026-06-24  
**Status:** Complete

## Goal

Fix AI Processing (`/ai-review`) layout so the left queue scrolls independently and the right workspace does not show multi-screen whitespace on failed items.

## Root cause

1. `.page-content-area { overflow-y: auto }` — entire page scrolls when layout grows.
2. `.ai-review-layout { min-height: clamp(...) }` — no max height; grows with tall queue.
3. `.ai-review-workspace { grid-template-rows: auto 1fr }` — flow section stretches to match stretched main panel (equal to queue height).

## Approach (CSS-first)

### Height chain

```
.page-content-area--ai-review (flex column, overflow hidden)
  └── .ai-review-page (flex 1, flex column, min-height 0, overflow hidden)
        ├── intro / error (flex-shrink 0)
        └── .ai-review-layout (flex 1, min-height 0, overflow hidden)
              ├── .ai-review-queue-panel (grid rows auto auto 1fr)
              │     └── .ai-review-queue-list (overflow-y auto)
              └── .ai-review-main-panel (min-height 0, overflow hidden)
                    └── .ai-review-workspace (flex column, bounded height)
                          ├── preview (flex-shrink 0)
                          └── .ai-review-workspace-flow (flex 1, overflow-y auto, align-content start)
```

### Route modifier

Add `page-content-area--ai-review` via `useLocation` in `AppShell.tsx` when pathname is `/ai-review`.

### Processing tab compaction

Add `ai-review-workspace--processing` class when `activeTab === "processing"` — smaller preview max-height.

### Mobile (`max-width: 1100px`)

Stacked grid: `grid-template-rows: minmax(0, 38vh) minmax(0, 1fr)` so queue gets bounded height with internal scroll.

## Scope

| In | Out |
|----|-----|
| `ai-review.css`, `navigation.css`, `AppShell.tsx`, minor `AiReviewWorkspace.tsx` | AI pipeline reliability |
| `STYLE_GUIDE.md` layout note | Queue card redesign |

## Risks

- Other routes unaffected (modifier class scoped).
- Stacked mobile queue height capped at 38vh — staff can still scroll queue internally.

## Testing

Manual visual checkpoint documented in test report.
