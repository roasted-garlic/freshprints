# Signoff: AI Review queue panel height

**Date:** 2026-06-25
**Status:** implementation complete — manual visual QA pending

## Summary

Queue panel height is capped to measured main workspace height via ResizeObserver (`useAiReviewMainPanelHeight`). CSS uses flex shrink-wrap with `--ai-review-main-panel-height`; list scrolls when queue exceeds cap.

## Changes

| File | Change |
|------|--------|
| `useAiReviewMainPanelHeight.ts` | Observe main panel; set CSS variable on layout |
| `AiReviewPage.tsx` | Wire ref + layout style |
| `ai-review.css` | Flex panel, max-height from variable, mobile min() cap |
| `STYLE_GUIDE.md` | Document height coupling |

## Tests (automated)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass |

## Manual Test Checkpoint

**Feature / area:** AI Review queue panel height vs workspace
**Environment:** local dev, desktop window sizes
**Prerequisites:** Designs in each tab; at least one tab with many queue items

### Steps

1. **Needs Review** — few queue items (1–3), full workspace
   **Expected:** Left panel hugs content; not taller than right; no large empty list area.
2. **Processing** — 10+ queue items
   **Expected:** Left height matches right; list scrolls inside left panel.
3. **Rejected** — medium queue — same height rules.
4. Resize window taller/shorter — left cap updates.
5. Switch tabs — height rule holds on each.

### Pass criteria

- [ ] min(content, right height) on all tabs
- [ ] No viewport-only max-height mismatch vs right panel
- [ ] Queue internal scroll works when capped

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

## Signoff approval

- [x] Automated checks pass
- [ ] Manual test checkpoint completed
