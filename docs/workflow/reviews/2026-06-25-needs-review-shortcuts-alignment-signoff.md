# Signoff: Needs Review shortcut hints alignment

**Date:** 2026-06-25  
**Status:** approved — manual visual QA pending

## Summary
Split Needs Review shortcut hints into left (A/R) and right (J/K) columns. Rejected tab shows J/K under Previous/Next only. Processing auto-advance row unchanged (added `--end` align class only).

## Tests
| Command | Result |
|---------|--------|
| `tsc --noEmit` | pass |
| `eslint` | pass |
| `aiReviewKeyboardShortcuts.test.ts` (3) | pass |

## Manual Test Checkpoint

**Feature / area:** AI Review shortcut hint alignment  
**Environment:** local dev

### Steps
1. Needs Review → select design → left hint under Approve/Reject; right hint under Previous/Next
2. Press A, R, J, K → actions work
3. Processing → auto-advance row unchanged
4. Rejected → J/K hint under Previous/Next on right

### Please reply with
- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
