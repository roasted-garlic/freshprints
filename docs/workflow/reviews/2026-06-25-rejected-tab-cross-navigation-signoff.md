# Signoff: Rejected tab cross-navigation + Re-run AI header

**Date:** 2026-06-25
**Status:** implementation complete — manual QA pending

## Summary

Rejected **Reopen** navigates to Needs Review; **Re-run AI Suggestions** navigates to Processing — same `designId` preserved via `pendingCrossTabSelectionRef`. Needs Review **Re-run AI** moved to AI Suggestions section header (top right).

## Tests (automated)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass |
| `npx tsx --test src/renderer/src/features/ai-review/utils/aiReviewInboxSelection.test.ts` | pass |

## Manual Test Checkpoint

### Cross-navigation
1. Rejected → **Reopen for Review** → Needs Review, same design selected
2. Rejected → **Re-run AI Suggestions** → Processing, same design, processing UI visible
3. Design absent from Rejected after reopen
4. Manual tab switch → normal first-item selection

### Re-run AI layout
5. Needs Review → Re-run AI top-right of AI Suggestions header
6. Click Re-run AI → disabled / Re-running… / overlay unchanged

Reply: `PASS`, `FAIL: …`, or `PASS WITH NOTES: …`

## Signoff approval

- [x] Automated checks pass
- [ ] Manual test checkpoint completed
